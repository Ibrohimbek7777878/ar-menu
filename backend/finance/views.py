import csv
import logging
from decimal import Decimal
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.utils import timezone
from django.db.models import Sum, Q, Prefetch
from django.views.decorators.http import require_POST
from web.seller_views import seller_required
from finance.models import FinanceCategory, FinanceTransaction, DebtRecord, FinanceMovementHistory, FinanceCustomStage
from finance.services.defaults import seed_default_categories_for_shop
from finance.services.ai_copilot import process_finance_ai_query

logger = logging.getLogger('finance')

KANBAN_STAGES_CONFIG = [
    {
        'id': 'planned',
        'name': 'Kutilayotgan (Rejada)',
        'icon': '⏳',
        'color': 'amber',
        'badge_bg': 'bg-amber-50',
        'badge_text': 'text-amber-800',
        'border_color': 'border-amber-200',
        'header_bg': 'bg-amber-50',
        'default_type': 'expense',
        'description': 'Kassa balansiga hali kirmagan, kutilayotgan reja'
    },
    {
        'id': 'income',
        'name': 'Kassaga kirdi (+)',
        'icon': '🟢',
        'color': 'emerald',
        'badge_bg': 'bg-emerald-50',
        'badge_text': 'text-emerald-800',
        'border_color': 'border-emerald-200',
        'header_bg': 'bg-emerald-50',
        'default_type': 'income',
        'description': 'Kassaga haqiqatda tushgan naqd va plastik pullar'
    },
    {
        'id': 'expense',
        'name': 'Kassadan chiqdi (-)',
        'icon': '🔴',
        'color': 'rose',
        'badge_bg': 'bg-rose-50',
        'badge_text': 'text-rose-800',
        'border_color': 'border-rose-200',
        'header_bg': 'bg-rose-50',
        'default_type': 'expense',
        'description': 'Haqiqatda to\'langan mahsulot, ish haqi va xarajatlar'
    },
    {
        'id': 'debt',
        'name': 'Nasiyalar (Qarz daftari)',
        'icon': '🤝',
        'color': 'indigo',
        'badge_bg': 'bg-indigo-50',
        'badge_text': 'text-indigo-800',
        'border_color': 'border-indigo-200',
        'header_bg': 'bg-indigo-50',
        'default_type': 'income',
        'description': 'Mijoz nasiyasi yoki yetkazib beruvchi qarzlari'
    },
    {
        'id': 'settled',
        'name': 'Tugallangan (Tarix)',
        'icon': '✅',
        'color': 'gray',
        'badge_bg': 'bg-gray-100',
        'badge_text': 'text-gray-800',
        'border_color': 'border-gray-200',
        'header_bg': 'bg-gray-50',
        'default_type': 'expense',
        'description': 'Hisob-kitobi to\'liq yakunlangan yozuvlar'
    },
]

STAGE_NAMES = {
    'planned': 'Kutilayotgan (Rejada)',
    'income': 'Kassaga kirdi (+)',
    'expense': 'Kassadan chiqdi (-)',
    'debt': 'Nasiyalar (Qarz daftari)',
    'settled': 'Tugallangan (Tarix)',
    'realized': 'Kassa operatsiyasi'
}

@seller_required
def seller_finance(request):
    shop = request.tenant_shop
    seed_default_categories_for_shop(shop)
    # Bosqich nomlari shu do'kon uchun alohida nusxada. Avval umumiy modul lug'ati har so'rovda o'zgartirilardi:
    # bitta restoranning maxsus ustun nomlari boshqa restoran sahifasi va audit matnlariga o'tib ketardi (TZ R-FIN-09)
    stage_names = dict(STAGE_NAMES)
    stage_names.update({cs.stage_key: cs.name for cs in FinanceCustomStage.objects.filter(shop=shop)})
    today = timezone.localdate()
    is_ajax = request.headers.get('x-requested-with') == 'XMLHttpRequest' or 'application/json' in request.headers.get('accept', '')

    # ==================== POST HANDLERS (WITH DEEP ERROR LOGGING) ====================
    if request.method == 'POST':
        action = request.POST.get('action')
        logger.info(f"[FINANCE_ACTION] Shop #{shop.id} ('{shop.name}'), user='{request.user}', action='{action}'")

        if action == 'add_transaction':
            try:
                tx_type = request.POST.get('tx_type', 'expense')
                stage = request.POST.get('stage')
                if not stage:
                    stage = 'income' if tx_type == 'income' else 'expense'
                
                amount_raw = request.POST.get('amount', '0')
                amount_clean = amount_raw.replace(' ', '').replace(',', '.')
                cat_id = request.POST.get('category_id')
                title = request.POST.get('title', '').strip()
                pay_method = request.POST.get('payment_method', 'cash')
                color = request.POST.get('color', 'default').strip()
                notes = request.POST.get('notes', '').strip()
                date_val = request.POST.get('tx_date') or str(today)

                try:
                    amt = Decimal(amount_clean)
                    if amt <= 0:
                        raise ValueError(f"Summa musbat son bo'lishi kerak. Kiritilgan: {amount_raw}")
                except Exception as num_err:
                    logger.warning(f"[FINANCE_VAL_ERR] Noto'g'ri summa kiritildi: raw='{amount_raw}', err={num_err}")
                    if is_ajax: return JsonResponse({'success': False, 'error': "Iltimos, to'g'ri summa kiriting."})
                    messages.error(request, "Iltimos, to'g'ri summa kiriting.")
                    return redirect('seller_finance_web')

                category = None
                if cat_id:
                    category = FinanceCategory.objects.filter(pk=cat_id, shop=shop).first()

                # Dynamic color fallback based on type if default
                if not color or color == 'default':
                    color = 'emerald' if tx_type == 'income' else 'rose'

                tx = FinanceTransaction.objects.create(
                    shop=shop, category=category, tx_type=tx_type, stage=stage,
                    amount=amt, payment_method=pay_method, color=color,
                    title=title or (category.name if category else 'Operatsiya'),
                    notes=notes, tx_date=date_val, created_by=request.user
                )
                formatted_amt = f"{int(amt):,}".replace(",", " ")
                logger.info(f"[FINANCE_CREATED] Tx #{tx.id} created: {tx.title}, {formatted_amt} so'm, stage={stage}, color={color}")

                # Check if remainder was marked as split debt (Ta'minotchi / Mijoz nasiyasi)
                has_split_debt = request.POST.get('has_split_debt') in ['1', 'true', 'on']
                split_debt_created = False
                split_person = ""
                formatted_split_debt = ""
                if has_split_debt:
                    split_amt_raw = request.POST.get('split_debt_amount', '0')
                    split_amt_clean = split_amt_raw.replace(' ', '').replace(',', '.')
                    split_person = request.POST.get('split_person_name', '').strip()
                    split_phone = request.POST.get('split_phone', '').strip()
                    split_due = request.POST.get('split_due_date') or None
                    try:
                        split_amt = Decimal(split_amt_clean)
                        if split_amt > 0 and split_person:
                            debt_type = 'customer' if tx_type == 'income' else 'supplier'
                            DebtRecord.objects.create(
                                shop=shop,
                                debt_type=debt_type,
                                person_name=split_person,
                                phone=split_phone,
                                amount=split_amt,
                                due_date=split_due,
                                notes=f"{tx.title} bo'yicha qolgan qarz ({date_val})"
                            )
                            split_debt_created = True
                            formatted_split_debt = f"{int(split_amt):,}".replace(",", " ")
                            logger.info(f"[FINANCE_SPLIT_DEBT_CREATED] Auto debt created for {split_person}: {formatted_split_debt} so'm ({debt_type})")
                    except Exception as split_err:
                        logger.warning(f"[FINANCE_SPLIT_DEBT_WARN] Split debt error: {split_err}")

                if split_debt_created:
                    debt_role = "nasiya" if tx_type == 'income' else "qarz"
                    success_msg = f"✅ {'Kirim' if tx_type == 'income' else 'Xarajat'} ({formatted_amt} so'm) saqlandi va {split_person} ga {formatted_split_debt} so'm {debt_role} yozildi!"
                else:
                    success_msg = f"✅ {'Kirim' if tx_type == 'income' else 'Xarajat'} muvaffaqiyatli saqlandi: {formatted_amt} so'm"
                
                if is_ajax:
                    return JsonResponse({
                        'success': True,
                        'tx_id': tx.id,
                        'split_debt_created': split_debt_created,
                        'message': success_msg
                    })
                messages.success(request, success_msg)
            except Exception as e:
                logger.error(f"[FINANCE_ADD_ERR] Operatsiya qo'shishda kutilmagan xatolik: {e}", exc_info=True)
                if is_ajax: return JsonResponse({'success': False, 'error': "Operatsiyani saqlashda xatolik yuz berdi."})
                messages.error(request, "Operatsiyani saqlashda xatolik yuz berdi.")
            return redirect('seller_finance_web')

        elif action == 'edit_transaction':
            try:
                tx_id = request.POST.get('tx_id')
                tx = get_object_or_404(FinanceTransaction, pk=tx_id, shop=shop)

                amount_raw = request.POST.get('amount', '0')
                amount_clean = amount_raw.replace(' ', '').replace(',', '.')
                cat_id = request.POST.get('category_id')
                title = request.POST.get('title', '').strip()
                pay_method = request.POST.get('payment_method', tx.payment_method)
                color = request.POST.get('color', tx.color or 'default')
                notes = request.POST.get('notes', '').strip()
                date_val = request.POST.get('tx_date') or str(tx.tx_date)
                new_tx_type = request.POST.get('tx_type', tx.tx_type)
                new_stage = request.POST.get('stage', tx.stage)

                try:
                    amt = Decimal(amount_clean)
                    if amt <= 0:
                        raise ValueError(f"Summa musbat son bo'lishi kerak. Kiritilgan: {amount_raw}")
                except Exception as num_err:
                    logger.warning(f"[FINANCE_VAL_ERR] Tahrirlashda noto'g'ri summa: raw='{amount_raw}', err={num_err}")
                    if is_ajax: return JsonResponse({'success': False, 'error': "To'g'ri summa kiriting."})
                    messages.error(request, "To'g'ri summa kiriting.")
                    return redirect('seller_finance_web')

                old_stage = tx.stage
                old_type = tx.tx_type
                category = None
                if cat_id:
                    category = FinanceCategory.objects.filter(pk=cat_id, shop=shop).first()

                # Audit movement history if stage or type changed
                if old_stage != new_stage or old_type != new_tx_type:
                    from_desc = stage_names.get(old_stage, old_stage)
                    to_desc = stage_names.get(new_stage, new_stage)
                    FinanceMovementHistory.objects.create(
                        transaction=tx,
                        from_stage=from_desc,
                        to_stage=to_desc,
                        from_type=old_type,
                        to_type=new_tx_type,
                        moved_by=request.user,
                        note=f"Tahrirlash orqali o'zgartirildi ({from_desc} -> {to_desc})"
                    )

                tx.amount = amt
                tx.category = category
                tx.title = title or tx.title
                tx.payment_method = pay_method
                tx.color = color if color != 'default' else ('emerald' if new_tx_type == 'income' else 'rose')
                tx.notes = notes
                tx.tx_date = date_val
                tx.tx_type = new_tx_type
                tx.stage = new_stage
                tx.save()

                formatted_amt = f"{int(amt):,}".replace(",", " ")
                logger.info(f"[FINANCE_EDITED] Tx #{tx.id} updated by {request.user}: amt={formatted_amt}, color={tx.color}")
                if is_ajax:
                    return JsonResponse({'success': True, 'message': f"Operatsiya tahrirlandi: {formatted_amt} so'm"})
                messages.success(request, f"✏️ Operatsiya muvaffaqiyatli tahrirlandi: {formatted_amt} so'm")
            except Exception as e:
                logger.error(f"[FINANCE_EDIT_ERR] Tx #{request.POST.get('tx_id')} tahrirlashda xatolik: {e}", exc_info=True)
                if is_ajax: return JsonResponse({'success': False, 'error': "Tahrirlashda xatolik yuz berdi."})
                messages.error(request, "Tahrirlashda xatolik yuz berdi.")
            return redirect('seller_finance_web')

        elif action == 'move_transaction':
            try:
                tx_id = request.POST.get('tx_id')
                target_stage = request.POST.get('target_stage')
                move_note = request.POST.get('note', '').strip()

                tx = get_object_or_404(FinanceTransaction, pk=tx_id, shop=shop)
                old_stage = tx.stage
                old_type = tx.tx_type

                custom_stages_qs = FinanceCustomStage.objects.filter(shop=shop)
                valid_stages = ['planned', 'income', 'expense', 'debt', 'settled'] + list(custom_stages_qs.values_list('stage_key', flat=True))

                if target_stage in valid_stages and target_stage != old_stage:
                    new_type = old_type
                    if target_stage == 'income':
                        new_type = 'income'
                    elif target_stage == 'expense':
                        new_type = 'expense'
                    else:
                        cs_match = custom_stages_qs.filter(stage_key=target_stage).first()
                        if cs_match:
                            new_type = 'income' if cs_match.category_type == 'income' else 'expense'

                    from_desc = stage_names.get(old_stage, old_stage)
                    to_desc = stage_names.get(target_stage, target_stage)

                    FinanceMovementHistory.objects.create(
                        transaction=tx,
                        from_stage=from_desc,
                        to_stage=to_desc,
                        from_type=old_type,
                        to_type=new_type,
                        moved_by=request.user,
                        note=move_note or f"Doskada surildi ({from_desc} -> {to_desc})"
                    )

                    tx.stage = target_stage
                    tx.tx_type = new_type
                    tx.save()

                    logger.info(f"[FINANCE_MOVED] Tx #{tx.id} moved: {old_stage} -> {target_stage} by {request.user}")
                    if is_ajax:
                        return JsonResponse({
                            'success': True,
                            'message': f"Kartochka '{to_desc}' ustuniga muvaffaqiyatli ko'chirildi!",
                            'from_stage': from_desc,
                            'to_stage': to_desc
                        })
                    messages.success(request, f"🔄 Kartochka '{to_desc}' bosqichiga ko'chirildi!")
            except Exception as e:
                logger.error(f"[FINANCE_MOVE_ERR] Tx #{request.POST.get('tx_id')} ko'chirishda xatolik: {e}", exc_info=True)
                if is_ajax: return JsonResponse({'success': False, 'error': "Ko'chirishda xatolik yuz berdi."})
                messages.error(request, "Ko'chirishda xatolik yuz berdi.")
            return redirect('seller_finance_web')

        elif action == 'create_custom_stage':
            try:
                stage_name = request.POST.get('name', '').strip()
                cat_type = request.POST.get('category_type', 'expense')
                icon = request.POST.get('icon', '📋').strip() or '📋'
                color = request.POST.get('color', 'purple').strip()
                if stage_name:
                    import time, re
                    slug_base = re.sub(r'[^a-zA-Z0-9]', '_', stage_name.lower())[:20]
                    stage_key = f"custom_{slug_base}_{int(time.time()) % 100000}"
                    cs = FinanceCustomStage.objects.create(
                        shop=shop, name=stage_name, stage_key=stage_key,
                        icon=icon, category_type=cat_type, color=color
                    )
                    logger.info(f"[FINANCE_CUSTOM_STAGE] New stage created: #{cs.id} '{stage_name}' (key={stage_key}, type={cat_type})")
                    messages.success(request, f"Yangi ustun qo'shildi: {icon} {stage_name}")
            except Exception as e:
                logger.error(f"[FINANCE_CUSTOM_STAGE_ERR] Yangi ustun yaratishda xatolik: {e}", exc_info=True)
                messages.error(request, "Yangi ustun yaratishda xatolik yuz berdi.")
            return redirect('seller_finance_web')

        elif action == 'delete_custom_stage':
            try:
                stage_id = request.POST.get('stage_id')
                cs = FinanceCustomStage.objects.filter(pk=stage_id, shop=shop).first()
                if cs:
                    reassigned_count = FinanceTransaction.objects.filter(shop=shop, stage=cs.stage_key).update(stage='planned')
                    stage_name = cs.name
                    cs.delete()
                    logger.info(f"[FINANCE_STAGE_DELETED] Custom stage #{stage_id} '{stage_name}' deleted, {reassigned_count} txs reassigned to 'planned'")
                    messages.info(request, f"Ustun o'chirildi va uning {reassigned_count} ta kartochkasi 'Kutilayotgan (Rejada)' ustuniga ko'chirildi.")
            except Exception as e:
                logger.error(f"[FINANCE_STAGE_DEL_ERR] Ustun #{request.POST.get('stage_id')} o'chirishda xatolik: {e}", exc_info=True)
                messages.error(request, "Ustunni o'chirishda xatolik yuz berdi.")
            return redirect('seller_finance_web')

        elif action == 'pay_debt':
            try:
                debt_id = request.POST.get('debt_id')
                debt = get_object_or_404(DebtRecord, pk=debt_id, shop=shop)
                pay_raw = request.POST.get('pay_amount', '0')
                pay_clean = pay_raw.replace(' ', '').replace(',', '.')
                pay_method = request.POST.get('payment_method', 'cash')
                note = request.POST.get('note', '').strip()

                pay_amt = Decimal(pay_clean)
                if pay_amt <= 0:
                    raise ValueError("To'lov summasi 0 dan katta bo'lishi kerak.")

                remaining = debt.remaining_amount
                if pay_amt > remaining:
                    formatted_rem = f"{int(remaining):,}".replace(",", " ")
                    raise ValueError(f"To'lov summasi qarz qoldig'idan ({formatted_rem} so'm) ko'p bo'lishi mumkin emas!")

                debt.paid_amount += pay_amt
                if debt.paid_amount >= debt.amount:
                    debt.paid_amount = debt.amount
                    debt.status = 'settled'
                else:
                    debt.status = 'partial'
                debt.save()

                formatted_pay = f"{int(pay_amt):,}".replace(",", " ")
                # Auto-generate cash transaction to update cash registers!
                if debt.debt_type == 'customer':
                    FinanceTransaction.objects.create(
                        shop=shop, tx_type='income', stage='income',
                        amount=pay_amt, payment_method=pay_method, color='emerald',
                        title=f"🤝 Nasiya to'lovi: {debt.person_name}",
                        notes=note or f"{debt.person_name} ning nasiya qarzidan to'lov qabul qilindi",
                        created_by=request.user
                    )
                    success_msg = f"✅ {debt.person_name} dan {formatted_pay} so'm nasiya qabul qilindi va Kassaga kirdi!"
                else:
                    FinanceTransaction.objects.create(
                        shop=shop, tx_type='expense', stage='expense',
                        amount=pay_amt, payment_method=pay_method, color='rose',
                        title=f"🤝 Qarz to'landi: {debt.person_name}",
                        notes=note or f"Yetkazib beruvchi {debt.person_name} ga qarz to'landi",
                        created_by=request.user
                    )
                    success_msg = f"✅ {debt.person_name} ga {formatted_pay} so'm qarz to'landi va Kassadan chiqdi!"

                logger.info(f"[FINANCE_DEBT_PAID] Debt #{debt.id} ({debt.person_name}) paid {formatted_pay} so'm, status={debt.status}, method={pay_method}")
                if is_ajax:
                    return JsonResponse({'success': True, 'message': success_msg})
                messages.success(request, success_msg)
            except ValueError as ve:
                logger.warning(f"[FINANCE_DEBT_VAL_ERR] Nasiya to'lovida xato: {ve}")
                if is_ajax: return JsonResponse({'success': False, 'error': str(ve)})
                messages.error(request, str(ve))
            except Exception as e:
                logger.error(f"[FINANCE_DEBT_PAY_ERR] Debt #{request.POST.get('debt_id')} to'lovida xatolik: {e}", exc_info=True)
                if is_ajax: return JsonResponse({'success': False, 'error': "Qarz to'lovini saqlashda xatolik yuz berdi."})
                messages.error(request, "Qarz to'lovini saqlashda xatolik yuz berdi.")
            return redirect('seller_finance_web')

        elif action == 'settle_debt':
            try:
                debt_id = request.POST.get('debt_id')
                debt = get_object_or_404(DebtRecord, pk=debt_id, shop=shop)
                remaining = debt.remaining_amount
                pay_method = request.POST.get('payment_method', 'cash')
                
                if remaining > 0:
                    debt.paid_amount = debt.amount
                    debt.status = 'settled'
                    debt.save()
                    formatted_pay = f"{int(remaining):,}".replace(",", " ")
                    if debt.debt_type == 'customer':
                        FinanceTransaction.objects.create(
                            shop=shop, tx_type='income', stage='income',
                            amount=remaining, payment_method=pay_method, color='emerald',
                            title=f"🤝 Nasiya to'liq to'landi: {debt.person_name}",
                            created_by=request.user
                        )
                    else:
                        FinanceTransaction.objects.create(
                            shop=shop, tx_type='expense', stage='expense',
                            amount=remaining, payment_method=pay_method, color='rose',
                            title=f"🤝 Qarz to'liq to'landi: {debt.person_name}",
                            created_by=request.user
                        )
                else:
                    debt.status = 'settled'
                    debt.save()

                logger.info(f"[FINANCE_DEBT_SETTLED] Debt #{debt.id} completely settled.")
                messages.success(request, f"✅ {debt.person_name} ning qarzi to'liq yopildi va kassa yangilandi!")
            except Exception as e:
                logger.error(f"[FINANCE_DEBT_SETTLE_ERR] Qarz #{request.POST.get('debt_id')} to'liq yopishda xatolik: {e}", exc_info=True)
                messages.error(request, "Qarzni yopishda xatolik yuz berdi.")
            return redirect('seller_finance_web')

        elif action == 'cancel_transaction':
            try:
                tx_id = request.POST.get('tx_id')
                reason = request.POST.get('reason', '').strip() or "Adashib kiritilgan / bekor qilingan"
                tx = get_object_or_404(FinanceTransaction, pk=tx_id, shop=shop)

                tx.is_cancelled = True
                tx.cancel_reason = reason
                tx.cancelled_by = request.user
                tx.cancelled_at = timezone.now()
                tx.save()

                FinanceMovementHistory.objects.create(
                    transaction=tx,
                    from_stage=stage_names.get(tx.stage, tx.stage),
                    to_stage="Bekor qilingan (Audit)",
                    from_type=tx.tx_type,
                    to_type='cancelled',
                    moved_by=request.user,
                    note=f"Bekor qilindi: {reason}"
                )

                formatted_amt = f"{int(tx.amount):,}".replace(",", " ")
                logger.info(f"[FINANCE_CANCELLED] Tx #{tx.id} cancelled by {request.user}: '{reason}' ({formatted_amt} so'm)")
                if is_ajax:
                    return JsonResponse({'success': True, 'message': f"Operatsiya bekor qilindi: {formatted_amt} so'm"})
                messages.info(request, f"🗑️ Operatsiya bekor qilindi: {tx.title} ({formatted_amt} so'm)")
            except Exception as e:
                logger.error(f"[FINANCE_CANCEL_ERR] Tx #{request.POST.get('tx_id')} bekor qilishda xatolik: {e}", exc_info=True)
                messages.error(request, "Operatsiyani bekor qilishda xatolik yuz berdi.")
            return redirect('seller_finance_web')

        elif action == 'restore_transaction':
            try:
                tx_id = request.POST.get('tx_id')
                tx = get_object_or_404(FinanceTransaction, pk=tx_id, shop=shop)
                tx.is_cancelled = False
                tx.cancel_reason = ""
                tx.cancelled_by = None
                tx.cancelled_at = None
                tx.save()

                FinanceMovementHistory.objects.create(
                    transaction=tx,
                    from_stage="Bekor qilingan",
                    to_stage=stage_names.get(tx.stage, tx.stage),
                    from_type='cancelled',
                    to_type=tx.tx_type,
                    moved_by=request.user,
                    note="Qayta tiklandi"
                )

                formatted_amt = f"{int(tx.amount):,}".replace(",", " ")
                logger.info(f"[FINANCE_RESTORED] Tx #{tx.id} restored by {request.user}")
                if is_ajax:
                    return JsonResponse({'success': True, 'message': f"Operatsiya qayta tiklandi: {formatted_amt} so'm"})
                messages.success(request, f"🔄 Operatsiya qayta tiklandi: {tx.title} ({formatted_amt} so'm)")
            except Exception as e:
                logger.error(f"[FINANCE_RESTORE_ERR] Tx #{request.POST.get('tx_id')} tiklashda xatolik: {e}", exc_info=True)
                messages.error(request, "Operatsiyani tiklashda xatolik yuz berdi.")
            return redirect('seller_finance_web')

        elif action == 'create_category':
            try:
                cat_name = request.POST.get('name', '').strip()
                cat_type = request.POST.get('category_type', 'expense')
                icon = request.POST.get('icon', '📦').strip() or '📦'
                desc = request.POST.get('description', '').strip()
                if cat_name:
                    FinanceCategory.objects.create(
                        shop=shop, name=cat_name, category_type=cat_type,
                        icon=icon, description=desc
                    )
                    logger.info(f"[FINANCE_CAT_CREATED] Category '{cat_name}' ({cat_type}) created for shop #{shop.id}")
                    messages.success(request, f"Yangi kategoriya qo'shildi: {icon} {cat_name}")
            except Exception as e:
                logger.error(f"[FINANCE_CAT_ERR] Kategoriya yaratishda xatolik: {e}", exc_info=True)
                messages.error(request, "Kategoriya yaratishda xatolik yuz berdi.")
            return redirect('seller_finance_web')

        elif action == 'add_debt':
            try:
                person = request.POST.get('person_name', '').strip()
                phone = request.POST.get('phone', '').strip()
                amount_raw = request.POST.get('amount', '0')
                amount_clean = amount_raw.replace(' ', '').replace(',', '.')
                debt_type = request.POST.get('debt_type', 'customer')
                due_date = request.POST.get('due_date') or None
                notes = request.POST.get('notes', '').strip()

                amt = Decimal(amount_clean)
                if amt <= 0:
                    raise ValueError("Qarz summasi 0 dan katta bo'lishi kerak.")
                
                DebtRecord.objects.create(
                    shop=shop, debt_type=debt_type, person_name=person,
                    phone=phone, amount=amt, due_date=due_date, notes=notes
                )
                formatted_amt = f"{int(amt):,}".replace(",", " ")
                logger.info(f"[FINANCE_DEBT_ADDED] Debt record created: {person} ({formatted_amt} so'm, type={debt_type})")
                messages.success(request, f"🤝 Nasiya yozuvi saqlandi: {person} ({formatted_amt} so'm)")
            except Exception as e:
                logger.error(f"[FINANCE_DEBT_ADD_ERR] Qarz qo'shishda xatolik: {e}", exc_info=True)
                messages.error(request, "Qarz summasi noto'g'ri kiritildi.")
            return redirect('seller_finance_web')

        elif action == 'ai_copilot':
            try:
                query_text = request.POST.get('query', '').strip()
                if not query_text:
                    if is_ajax: return JsonResponse({'success': False, 'error': 'Matn bo\'sh'})
                    messages.error(request, "Iltimos, ovoz yoki matn kiriting.")
                    return redirect('seller_finance_web')

                result = process_finance_ai_query(shop, query_text, user=request.user)
                logger.info(f"[FINANCE_AI] Copilot query processed: '{query_text[:50]}...', success={result.get('success')}")
                if is_ajax:
                    return JsonResponse(result)
                messages.success(request, result['message'])
            except Exception as e:
                logger.error(f"[FINANCE_AI_ERR] AI Copilot xatosi: {e}", exc_info=True)
                if is_ajax: return JsonResponse({'success': False, 'error': 'AI orqali kiritishda xatolik yuz berdi.'})
                messages.error(request, "AI orqali kiritishda xatolik yuz berdi.")
            return redirect('seller_finance_web')

        elif action == 'delete_tx':
            try:
                tx_id = request.POST.get('tx_id')
                tx = FinanceTransaction.objects.filter(pk=tx_id, shop=shop).first()
                if tx:
                    # Safe soft-cancellation instead of permanent hard delete
                    tx.is_cancelled = True
                    tx.cancel_reason = "O'chirildi (Kassir/Egasi tomonidan)"
                    tx.cancelled_by = request.user
                    tx.cancelled_at = timezone.now()
                    tx.save()
                    logger.info(f"[FINANCE_DELETED_SAFE] Tx #{tx_id} safely cancelled/deleted by {request.user}")
                if is_ajax:
                    return JsonResponse({'success': True, 'message': "Operatsiya bekor qilindi va tarixga o'tkazildi."})
                messages.info(request, "Operatsiya bekor qilindi va tarixga o'tkazildi.")
            except Exception as e:
                logger.error(f"[FINANCE_DEL_TX_ERR] Tx #{request.POST.get('tx_id')} o'chirishda xatolik: {e}", exc_info=True)
                if is_ajax: return JsonResponse({'success': False, 'error': "Operatsiyani o'chirishda xatolik yuz berdi."})
                messages.error(request, "Operatsiyani o'chirishda xatolik yuz berdi.")
            return redirect('seller_finance_web')

        elif action == 'delete_debt':
            try:
                debt_id = request.POST.get('debt_id')
                DebtRecord.objects.filter(pk=debt_id, shop=shop).delete()
                logger.info(f"[FINANCE_DEBT_DELETED] Debt record #{debt_id} deleted by {request.user}")
                if is_ajax:
                    return JsonResponse({'success': True, 'message': "Qarz yozuvi o'chirildi."})
                messages.info(request, "Qarz yozuvi o'chirildi.")
            except Exception as e:
                logger.error(f"[FINANCE_DEL_DEBT_ERR] Qarz #{request.POST.get('debt_id')} o'chirishda xatolik: {e}", exc_info=True)
                if is_ajax: return JsonResponse({'success': False, 'error': "Qarzni o'chirishda xatolik yuz berdi."})
                messages.error(request, "Qarzni o'chirishda xatolik yuz berdi.")
            return redirect('seller_finance_web')

        elif action == 'get_movements':
            try:
                tx_id = request.POST.get('tx_id')
                tx = get_object_or_404(FinanceTransaction, pk=tx_id, shop=shop)
                movements = tx.movements.select_related('moved_by').all()
                data = []
                for m in movements:
                    user_title = m.moved_by.get_full_name() or m.moved_by.username if m.moved_by else "Tizim / Foydalanuvchi"
                    data.append({
                        'from_stage': m.from_stage,
                        'to_stage': m.to_stage,
                        'from_type': m.from_type,
                        'to_type': m.to_type,
                        'moved_by': user_title,
                        'moved_at': timezone.localtime(m.moved_at).strftime('%d.%m.%Y %H:%M'),
                        'note': m.note or "Bosqich o'zgartirildi"
                    })
                return JsonResponse({'success': True, 'tx_title': tx.title, 'amount': f"{int(tx.amount):,}".replace(',', ' '), 'movements': data})
            except Exception as e:
                logger.error(f"[FINANCE_MOVEMENTS_ERR] Harakatlar tarixini olishda xatolik: {e}", exc_info=True)
                return JsonResponse({'success': False, 'error': "Tarixni yuklashda xatolik."})

        elif action == 'send_telegram_report':
            try:
                today_date = timezone.localdate()
                tx_today = FinanceTransaction.objects.filter(shop=shop, tx_date=today_date, is_cancelled=False)
                inc_tot = tx_today.filter(tx_type='income', stage__in=['income', 'realized']).aggregate(s=Sum('amount'))['s'] or Decimal('0')
                inc_c = tx_today.filter(tx_type='income', payment_method='cash', stage__in=['income', 'realized']).aggregate(s=Sum('amount'))['s'] or Decimal('0')
                inc_k = tx_today.filter(tx_type='income', stage__in=['income', 'realized']).exclude(payment_method='cash').aggregate(s=Sum('amount'))['s'] or Decimal('0')
                exp_tot = tx_today.filter(tx_type='expense', stage__in=['expense', 'realized']).aggregate(s=Sum('amount'))['s'] or Decimal('0')
                exp_c = tx_today.filter(tx_type='expense', payment_method='cash', stage__in=['expense', 'realized']).aggregate(s=Sum('amount'))['s'] or Decimal('0')
                exp_k = tx_today.filter(tx_type='expense', stage__in=['expense', 'realized']).exclude(payment_method='cash').aggregate(s=Sum('amount'))['s'] or Decimal('0')
                net_prof = inc_tot - exp_tot
                net_c = inc_c - exp_c
                net_k = inc_k - exp_k

                debts_qs = DebtRecord.objects.filter(shop=shop).exclude(status='settled')
                cust_d = debts_qs.filter(debt_type='customer').aggregate(s=Sum('amount') - Sum('paid_amount'))['s'] or Decimal('0')
                supp_d = debts_qs.filter(debt_type='supplier').aggregate(s=Sum('amount') - Sum('paid_amount'))['s'] or Decimal('0')

                report_text = (
                    f"📊 <b>{shop.name} — KUNLIK KASSA HISOBOTI ({today_date.strftime('%d.%m.%Y')})</b>\n"
                    f"━━━━━━━━━━━━━━━━━━━\n"
                    f"🟢 <b>Kassa Kirimi:</b> {int(inc_tot):,} so'm\n"
                    f"   • 💵 Naqd: {int(inc_c):,} so'm\n"
                    f"   • 💳 Plastik: {int(inc_k):,} so'm\n\n"
                    f"🔴 <b>Kassa Chiqimi:</b> {int(exp_tot):,} so'm\n"
                    f"   • 💵 Naqd: {int(exp_c):,} so'm\n"
                    f"   • 💳 Plastik: {int(exp_k):,} so'm\n\n"
                    f"💎 <b>Sof Kassa (Foyda):</b> {int(net_prof):,} so'm\n"
                    f"   • 💵 Naqd qoldiq: {int(net_c):,} so'm\n"
                    f"   • 💳 Plastik hisob: {int(net_k):,} so'm\n\n"
                    f"🤝 <b>Nasiyalar Holati:</b>\n"
                    f"   • 📥 Bizga berishadi: {int(cust_d):,} so'm\n"
                    f"   • 📤 Biz beramiz: {int(supp_d):,} so'm\n"
                    f"━━━━━━━━━━━━━━━━━━━\n"
                    f"✅ <i>Universal Kassa & Moliya tizimi</i>"
                ).replace(",", " ")

                from django.conf import settings
                bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
                chat_id = getattr(settings, 'TELEGRAM_CHAT_ID', '')
                sent_success = False
                tg_err = ""
                if bot_token and chat_id:
                    try:
                        from notifications.services.telegram_service import _send_message
                        res = _send_message(chat_id, report_text, parse_mode='HTML')
                        sent_success = res.get('success', False)
                        tg_err = res.get('error', '')
                    except Exception as err:
                        logger.warning(f"[FINANCE_TG_WARN] Telegram yuborishda xatolik: {err}")
                        tg_err = str(err)

                logger.info(f"[FINANCE_TG_REPORT] Report generated: sent={sent_success}, chat_id={chat_id}")
                if is_ajax:
                    return JsonResponse({
                        'success': True,
                        'sent_to_telegram': sent_success,
                        'report_text': report_text,
                        'message': "📲 Hisobot Telegramga yuborildi!" if sent_success else "📋 Hisobot tayyorlandi (nusxa olishingiz mumkin)."
                    })
                if sent_success:
                    messages.success(request, "📲 Kunlik hisobot Telegramga yuborildi!")
                else:
                    messages.info(request, "Kunlik hisobot tayyorlandi.")
            except Exception as e:
                logger.error(f"[FINANCE_TG_REPORT_ERR] Telegram hisobotda xatolik: {e}", exc_info=True)
                if is_ajax: return JsonResponse({'success': False, 'error': "Hisobot tayyorlashda xatolik yuz berdi."})
                messages.error(request, "Hisobot tayyorlashda xatolik yuz berdi.")
            return redirect('seller_finance_web')

    # ==================== GET QUERY CALCULATIONS ====================
    categories = FinanceCategory.objects.filter(shop=shop).order_by('category_type', 'sort_order', 'name')
    
    period = request.GET.get('period', 'today')
    if period == 'month':
        start_date = today.replace(day=1)
    elif period == '7days':
        start_date = today - timezone.timedelta(days=7)
    elif period == 'year':
        start_date = today.replace(month=1, day=1)
    else:
        period = 'today'
        start_date = today

    tx_qs = FinanceTransaction.objects.filter(shop=shop, tx_date__gte=start_date).select_related('category')
    
    # Custom stages for this shop
    custom_stages = FinanceCustomStage.objects.filter(shop=shop).order_by('sort_order', 'id')
    for cs in custom_stages:
        stage_names[cs.stage_key] = cs.name

    # Realized stages list: includes standard income, expense, realized AND custom stages with category_type in ['income', 'expense', 'capital']
    realized_stages = ['income', 'expense', 'realized']
    for cs in custom_stages:
        if cs.category_type in ['income', 'expense', 'capital']:
            realized_stages.append(cs.stage_key)

    # Exclude cancelled transactions from active balances
    active_tx_qs = tx_qs.filter(is_cancelled=False)
    realized_tx_qs = active_tx_qs.filter(stage__in=realized_stages)

    income_total = realized_tx_qs.filter(tx_type='income').aggregate(s=Sum('amount'))['s'] or Decimal('0')
    expense_total = realized_tx_qs.filter(tx_type='expense').aggregate(s=Sum('amount'))['s'] or Decimal('0')
    net_profit = income_total - expense_total

    # Cash vs Card breakdown (Crucial for Sobir tog'a!)
    income_cash = realized_tx_qs.filter(tx_type='income', payment_method='cash').aggregate(s=Sum('amount'))['s'] or Decimal('0')
    income_card = realized_tx_qs.filter(tx_type='income').exclude(payment_method='cash').aggregate(s=Sum('amount'))['s'] or Decimal('0')

    expense_cash = realized_tx_qs.filter(tx_type='expense', payment_method='cash').aggregate(s=Sum('amount'))['s'] or Decimal('0')
    expense_card = realized_tx_qs.filter(tx_type='expense').exclude(payment_method='cash').aggregate(s=Sum('amount'))['s'] or Decimal('0')

    net_cash = income_cash - expense_cash
    net_card = income_card - expense_card

    # Debts KPI
    pending_debts = DebtRecord.objects.filter(shop=shop).exclude(status='settled')
    customer_debt_total = pending_debts.filter(debt_type='customer').aggregate(s=Sum('amount') - Sum('paid_amount'))['s'] or Decimal('0')
    supplier_debt_total = pending_debts.filter(debt_type='supplier').aggregate(s=Sum('amount') - Sum('paid_amount'))['s'] or Decimal('0')

    # All active transactions with movement history prefetched
    movements_prefetch = Prefetch('movements', queryset=FinanceMovementHistory.objects.select_related('moved_by').order_by('-moved_at'))
    transactions = (
        FinanceTransaction.objects.filter(shop=shop, is_cancelled=False)
        .select_related('category', 'created_by')
        .prefetch_related(movements_prefetch)
        .order_by('-tx_date', '-created_at')[:150]
    )
    
    # Cancelled transactions list (Safe audit trail)
    cancelled_transactions = (
        FinanceTransaction.objects.filter(shop=shop, is_cancelled=True)
        .select_related('category', 'cancelled_by')
        .order_by('-cancelled_at', '-created_at')[:50]
    )

    # All debts
    debts = DebtRecord.objects.filter(shop=shop).order_by('-created_at')

    # Category breakdown for chart
    cat_expenses = (
        realized_tx_qs.filter(tx_type='expense')
        .values('category__name', 'category__icon', 'category__color')
        .annotate(total=Sum('amount'))
        .order_by('-total')
    )

    # Kanban Columns construction (Active non-cancelled cards)
    kanban_columns = []
    for cfg in KANBAN_STAGES_CONFIG:
        stage_id = cfg['id']
        col_txs = []
        for t in transactions:
            if t.stage == stage_id:
                col_txs.append(t)
            elif t.stage == 'realized':
                if stage_id == 'income' and t.tx_type == 'income':
                    col_txs.append(t)
                elif stage_id == 'expense' and t.tx_type == 'expense':
                    col_txs.append(t)
        
        col_sum = sum(t.amount for t in col_txs)
        kanban_columns.append({
            'config': cfg,
            'transactions': col_txs,
            'total_sum': col_sum,
            'count': len(col_txs)
        })

    # Add custom user-created columns
    for cs in custom_stages:
        col_txs = [t for t in transactions if t.stage == cs.stage_key]
        col_sum = sum(t.amount for t in col_txs)
        kanban_columns.append({
            'config': {
                'id': cs.stage_key,
                'name': cs.name,
                'icon': cs.icon,
                'color': cs.color or 'purple',
                'badge_bg': 'bg-purple-100',
                'badge_text': 'text-purple-800',
                'border_color': 'border-purple-200',
                'header_bg': 'bg-purple-50',
                'default_type': cs.category_type,
                'description': cs.get_category_type_display(),
                'is_custom': True,
                'custom_id': cs.id
            },
            'transactions': col_txs,
            'total_sum': col_sum,
            'count': len(col_txs)
        })

    return render(request, 'seller/finance.html', {
        'shop': shop,
        'period': period,
        'income_total': income_total,
        'income_cash': income_cash,
        'income_card': income_card,
        'expense_total': expense_total,
        'expense_cash': expense_cash,
        'expense_card': expense_card,
        'net_profit': net_profit,
        'net_cash': net_cash,
        'net_card': net_card,
        'customer_debt_total': customer_debt_total,
        'supplier_debt_total': supplier_debt_total,
        'categories': categories,
        'transactions': transactions,
        'cancelled_transactions': cancelled_transactions,
        'debts': debts,
        'cat_expenses': cat_expenses,
        'today': today,
        'kanban_columns': kanban_columns,
        'custom_stages': custom_stages,
    })


@seller_required
def finance_export_excel(request):
    """Excel orqali ochishga moslashtirilgan UTF-8 CSV fayli eksporti (bitta BOM bilan)."""
    from django.utils.dateparse import parse_date
    shop = request.tenant_shop
    today = timezone.localdate()
    transactions = (
        FinanceTransaction.objects.filter(shop=shop, is_cancelled=False)
        .select_related('category', 'created_by', 'order')
        .prefetch_related('movements')
        .order_by('-tx_date', '-created_at')
    )

    from_date = request.GET.get('from')
    to_date = request.GET.get('to')
    if from_date:
        parsed_from = parse_date(from_date)
        if parsed_from:
            transactions = transactions.filter(tx_date__gte=parsed_from)
    if to_date:
        parsed_to = parse_date(to_date)
        if parsed_to:
            transactions = transactions.filter(tx_date__lte=parsed_to)

    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="moliya_{shop.slug}_{today}.csv"'

    # Yagona UTF-8 BOM — Excel'da to'g'ri ochilishi uchun (har qatorda emas, faqat bir marta boshida)
    response.write('\ufeff')
    writer = csv.writer(response)

    writer.writerow([
        "ID",
        "Sana",
        "Buyurtma №",
        "Bosqich (Holati)",
        "Turi",
        "Kategoriya",
        "Mazmuni / Nomi",
        "Summa (so'm)",
        "To'lov shakli",
        "Qo'shimcha Izoh",
        "Kiritgan xodim",
        "Joyi o'zgartirilganmi",
    ])

    for t in transactions:
        stage_desc = t.stage_name
        tx_type_desc = "Kirim (+)" if t.tx_type == 'income' else "Chiqim (-)"
        cat_name = t.category.name if t.category else "Umumiy"
        moved_status = "Ha (O'zgartirilgan)" if t.is_moved else "Yo'q (Asl holat)"
        order_num = t.order.order_number if t.order else ""
        if t.created_by:
            created_by_name = t.created_by.get_full_name() or t.created_by.username
        else:
            created_by_name = "Tizim"

        writer.writerow([
            t.id,
            t.tx_date.strftime('%d.%m.%Y'),
            order_num,
            stage_desc,
            tx_type_desc,
            cat_name,
            t.title or "",
            f"{float(t.amount):.2f}",
            t.get_payment_method_display(),
            t.notes or "",
            created_by_name,
            moved_status,
        ])

    return response


@seller_required
def finance_export_pdf(request):
    """Chop etish va PDF saqlash uchun maxsus formatlangan A4 hisobot sahifasi."""
    shop = request.tenant_shop
    today = timezone.localdate()
    period = request.GET.get('period', 'month')

    if period == 'month':
        start_date = today.replace(day=1)
        period_title = f"{today.strftime('%B %Y')} oylik hisoboti"
    elif period == '7days':
        start_date = today - timezone.timedelta(days=7)
        period_title = "Oxirgi 7 kunlik hisobot"
    elif period == 'year':
        start_date = today.replace(month=1, day=1)
        period_title = f"{today.year}-yil yillik hisoboti"
    else:
        start_date = today
        period_title = f"{today.strftime('%d.%m.%Y')} kunlik hisobot"

    tx_qs = (
        FinanceTransaction.objects.filter(shop=shop, tx_date__gte=start_date, is_cancelled=False)
        .select_related('category', 'created_by')
        .order_by('-tx_date')
    )

    custom_stages = FinanceCustomStage.objects.filter(shop=shop)
    realized_stages = ['income', 'expense', 'realized'] + [
        cs.stage_key for cs in custom_stages if cs.category_type in ['income', 'expense', 'capital']
    ]
    realized_txs = tx_qs.filter(stage__in=realized_stages)
    income_total = realized_txs.filter(tx_type='income').aggregate(s=Sum('amount'))['s'] or Decimal('0')
    income_cash = realized_txs.filter(tx_type='income', payment_method='cash').aggregate(s=Sum('amount'))['s'] or Decimal('0')
    income_card = realized_txs.filter(tx_type='income').exclude(payment_method='cash').aggregate(s=Sum('amount'))['s'] or Decimal('0')

    expense_total = realized_txs.filter(tx_type='expense').aggregate(s=Sum('amount'))['s'] or Decimal('0')
    expense_cash = realized_txs.filter(tx_type='expense', payment_method='cash').aggregate(s=Sum('amount'))['s'] or Decimal('0')
    expense_card = realized_txs.filter(tx_type='expense').exclude(payment_method='cash').aggregate(s=Sum('amount'))['s'] or Decimal('0')

    net_profit = income_total - expense_total
    net_cash = income_cash - expense_cash
    net_card = income_card - expense_card

    cat_breakdown = (
        realized_txs.filter(tx_type='expense')
        .values('category__name', 'category__icon')
        .annotate(total=Sum('amount'))
        .order_by('-total')
    )

    debts = DebtRecord.objects.filter(shop=shop).exclude(status='settled')
    customer_debt_total = debts.filter(debt_type='customer').aggregate(s=Sum('amount') - Sum('paid_amount'))['s'] or Decimal('0')
    supplier_debt_total = debts.filter(debt_type='supplier').aggregate(s=Sum('amount') - Sum('paid_amount'))['s'] or Decimal('0')

    return render(request, 'seller/finance_pdf.html', {
        'shop': shop,
        'today': today,
        'period_title': period_title,
        'income_total': income_total,
        'income_cash': income_cash,
        'income_card': income_card,
        'expense_total': expense_total,
        'expense_cash': expense_cash,
        'expense_card': expense_card,
        'net_profit': net_profit,
        'net_cash': net_cash,
        'net_card': net_card,
        'customer_debt_total': customer_debt_total,
        'supplier_debt_total': supplier_debt_total,
        'cat_breakdown': cat_breakdown,
        'transactions': tx_qs[:100],
    })


@seller_required
@require_POST
def finance_install_preset(request):
    """
    Trojan Horse Onboarding: Foydalanuvchi interaktiv slaydlarni ko'rib chiqib,
    o'z biznesiga mos andozani tanlaganda do'kon kategoriyalari va bosqichlarini sozlab beradi.
    """
    shop = request.tenant_shop
    preset_type = request.POST.get('preset_type', 'choyxona')
    is_ajax = request.headers.get('x-requested-with') == 'XMLHttpRequest' or 'application/json' in request.headers.get('accept', '')

    presets = {
        'choyxona': {
            'name': 'Choyxona & Milliy Taomlar',
            'categories': [
                ('Go\'sht va Dumg\'aza', '🥩', '#ef4444', 'expense', 'Qo\'y, mol go\'shti va charvi'),
                ('Guruch, Yog\' va Sabzilar', '🌾', '#f59e0b', 'expense', 'Devzira, paxta moyi, sariq sabzi'),
                ('Ichimliklar va Choylar', '🫖', '#06b6d4', 'expense', 'Ko\'k choy, qora choy, limon, suvlar'),
                ('Non va Patirlar', '🍞', '#eab308', 'expense', 'Yopma non, tandir patir'),
                ('Oshpaz va Xodimlar Haqi', '👨‍🍳', '#ec4899', 'expense', 'Kundalik yoki oylik ish haqi'),
                ('Bino va O\'choq Ijarasi', '🏢', '#6366f1', 'expense', 'Choyxona oylik ijarasi'),
                ('Kommunal (Gaz, Svet, Suv)', '⚡', '#8b5cf6', 'expense', 'Gaz, elektr va suv to\'lovlari'),
                ('Zaldagi Choyxona Savdosi', '🍽️', '#10b981', 'income', 'Stollardan tushgan barcha kassa'),
                ('Yetkazib berish (Dostavka)', '🛵', '#3b82f6', 'income', 'Osh va kabob dostavkasi'),
                ('Katta To\'y va Banketlar', '🎉', '#8b5cf6', 'income', 'Zakalat va katta buyurtmalar'),
                ('Xo\'jayin Sarmoyasi', '💼', '#0284c7', 'capital', 'Kassaga kiritilgan shaxsiy pul'),
            ]
        },
        'fastfood': {
            'name': 'Fast-Food & Kafe',
            'categories': [
                ('Lavash, Bulochka va Non', '🥖', '#f59e0b', 'expense', 'Pita, lavash xamiri, bulochkalar'),
                ('Go\'sht, Tovuq va Sosikalar', '🍗', '#ef4444', 'expense', 'Dona go\'shti, strips, tovuq go\'shti'),
                ('Souslar, Mayonez va Pishloq', '🧀', '#fbbf24', 'expense', 'Pishloq, souslar, ketchuplar'),
                ('Qadoqlash va Paketlar', '📦', '#64748b', 'expense', 'Karton qutilar, stakanlar, paketlar'),
                ('Kuryer va Yetkazib berish', '🛵', '#0284c7', 'expense', 'Dostavka xizmati xarajatlari'),
                ('Xodimlar Oyligi', '🧑‍🍳', '#ec4899', 'expense', 'Kassir, oshpaz va yordamchilar'),
                ('Fast-Food Kassa Savdosi', '🍔', '#10b981', 'income', 'Kunlik kassaga kirgan tushum'),
                ('Dostavka Tushumlari', '🛵', '#3b82f6', 'income', 'Yandex / Express orqali savdo'),
            ]
        },
        'magazin': {
            'name': 'Do\'kon & Chakana Savdo',
            'categories': [
                ('Ulgurji Tovar Xaridi', '📦', '#ef4444', 'expense', 'Yetkazib beruvchilardan tovar olish'),
                ('Transport va Dostavka', '🚚', '#3b82f6', 'expense', 'Tovarlarni olib kelish xarajati'),
                ('Do\'kon Ijarasi', '🏢', '#6366f1', 'expense', 'Savdo nuqtasi oylik ijarasi'),
                ('Sotuvchi Maoshi', '💁‍♂️', '#ec4899', 'expense', 'Kunlik yoki foizli oylik'),
                ('Kunlik Savdo Tushumi', '💵', '#10b981', 'income', 'Kassadagi umumiy tushum'),
                ('Plastik / Click Tushumi', '💳', '#059669', 'income', 'Kartadan qilingan to\'lovlar'),
            ]
        }
    }

    selected = presets.get(preset_type, presets['choyxona'])

    # Add any missing categories
    created_count = 0
    for name, icon, color, cat_type, desc in selected['categories']:
        if not FinanceCategory.objects.filter(shop=shop, name=name).exists():
            FinanceCategory.objects.create(
                shop=shop, name=name, icon=icon, color=color,
                category_type=cat_type, description=desc, is_system=False
            )
            created_count += 1

    # Ensure existing transactions without a stage are mapped
    for t in FinanceTransaction.objects.filter(shop=shop):
        if not t.stage or t.stage == 'realized':
            t.stage = 'income' if t.tx_type == 'income' else 'expense'
            t.save(update_fields=['stage'])

    msg = f"🚀 '{selected['name']}' andozasi do'koningizga muvaffaqiyatli o'rnatildi! ({created_count} ta yangi toifa qo'shildi)"
    if is_ajax:
        return JsonResponse({'success': True, 'message': msg})
    messages.success(request, msg)
    return redirect('seller_finance_web')
