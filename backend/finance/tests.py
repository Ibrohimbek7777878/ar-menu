from decimal import Decimal
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from shops.models import Shop
from finance.models import FinanceCategory, FinanceTransaction, DebtRecord, FinanceMovementHistory, FinanceCustomStage
from finance.services.defaults import seed_default_categories_for_shop
from finance.services.ai_copilot import parse_uzbek_amount, process_finance_ai_query

User = get_user_model()

class FinanceAppTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='test_owner', password='password123', role='shop_owner')
        self.shop = Shop.objects.create(
            name='Test Choyxona', 
            slug='test-choyxona', 
            owner=self.user,
            latitude=Decimal('40.4998'),
            longitude=Decimal('68.7845')
        )
        self.client.login(username='test_owner', password='password123')

    def test_seed_default_categories(self):
        seed_default_categories_for_shop(self.shop)
        categories = FinanceCategory.objects.filter(shop=self.shop)
        self.assertGreater(categories.count(), 8)
        self.assertTrue(categories.filter(category_type='expense', name__icontains='Go\'sht').exists())
        self.assertTrue(categories.filter(category_type='income', name__icontains='Savdo').exists())

    def test_create_transaction_and_kpis(self):
        seed_default_categories_for_shop(self.shop)
        cat_inc = FinanceCategory.objects.filter(shop=self.shop, category_type='income').first()
        cat_exp = FinanceCategory.objects.filter(shop=self.shop, category_type='expense').first()

        tx_inc = FinanceTransaction.objects.create(
            shop=self.shop, category=cat_inc, tx_type='income', stage='income',
            amount=Decimal('5000000'), title='Kassa savdosi'
        )
        tx_exp = FinanceTransaction.objects.create(
            shop=self.shop, category=cat_exp, tx_type='expense', stage='expense',
            amount=Decimal('2000000'), title='Go\'sht va yog\''
        )
        self.assertEqual(tx_inc.amount, Decimal('5000000'))
        self.assertEqual(tx_exp.amount, Decimal('2000000'))
        self.assertFalse(tx_inc.is_moved)

    def test_category_with_description_and_types(self):
        cat = FinanceCategory.objects.create(
            shop=self.shop,
            name='To\'yxona go\'shti',
            category_type='planned',
            description='Katta to\'ylar uchun oldindan rejalashtirilgan go\'sht xarajatlari',
            icon='🥩'
        )
        self.assertEqual(cat.description, 'Katta to\'ylar uchun oldindan rejalashtirilgan go\'sht xarajatlari')
        self.assertEqual(cat.category_type, 'planned')

    def test_create_custom_stage_and_kanban_integration(self):
        # Create custom stage via POST
        res = self.client.post(reverse('seller_finance_web'), {
            'action': 'create_custom_stage',
            'name': 'Oshxona remont',
            'icon': '🔨',
            'category_type': 'capital',
            'color': 'indigo'
        })
        self.assertEqual(res.status_code, 302)
        stage = FinanceCustomStage.objects.filter(shop=self.shop, name='Oshxona remont').first()
        self.assertIsNotNone(stage)
        self.assertEqual(stage.category_type, 'capital')
        self.assertEqual(stage.icon, '🔨')
        self.assertTrue(stage.stage_key.startswith('custom_'))

        # Check kanban view includes this custom stage
        view_res = self.client.get(reverse('seller_finance_web'))
        self.assertEqual(view_res.status_code, 200)
        self.assertContains(view_res, 'Oshxona remont')
        self.assertContains(view_res, '🔨')

        # Add transaction directly to this custom stage with notes
        tx_res = self.client.post(reverse('seller_finance_web'), {
            'action': 'add_transaction',
            'title': 'Kafel ustasiga bo\'nak',
            'amount': '2 500 000',
            'stage': stage.stage_key,
            'tx_type': 'capital',
            'notes': 'Plitka terish uchun oldindan berilgan summa'
        })
        self.assertEqual(tx_res.status_code, 302)
        tx = FinanceTransaction.objects.filter(shop=self.shop, title='Kafel ustasiga bo\'nak').first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount, Decimal('2500000'))
        self.assertEqual(tx.stage, stage.stage_key)
        self.assertEqual(tx.tx_type, 'capital')
        self.assertEqual(tx.notes, 'Plitka terish uchun oldindan berilgan summa')

        # Delete custom stage and verify reassignment to 'planned'
        del_res = self.client.post(reverse('seller_finance_web'), {
            'action': 'delete_custom_stage',
            'stage_id': stage.id
        })
        self.assertEqual(del_res.status_code, 302)
        self.assertFalse(FinanceCustomStage.objects.filter(id=stage.id).exists())
        tx.refresh_from_db()
        self.assertEqual(tx.stage, 'planned')

    def test_edit_transaction_and_movement_history(self):
        cat = FinanceCategory.objects.create(shop=self.shop, name='Go\'sht', category_type='expense')
        tx = FinanceTransaction.objects.create(
            shop=self.shop, category=cat, tx_type='expense', stage='planned',
            amount=Decimal('15000000'), title='Go\'sht reja'
        )
        self.assertFalse(tx.is_moved)

        # Edit via POST
        res = self.client.post(reverse('seller_finance_web'), {
            'action': 'edit_transaction',
            'tx_id': tx.id,
            'amount': '16 000 000',
            'title': 'Go\'sht to\'liq to\'landi',
            'category_id': cat.id,
            'tx_type': 'expense',
            'stage': 'expense',
            'payment_method': 'cash',
            'tx_date': '2026-09-18'
        })
        self.assertEqual(res.status_code, 302)

        tx.refresh_from_db()
        self.assertEqual(tx.amount, Decimal('16000000'))
        self.assertEqual(tx.title, 'Go\'sht to\'liq to\'landi')
        self.assertEqual(tx.stage, 'expense')
        self.assertTrue(tx.is_moved)
        movement = tx.movements.first()
        self.assertIn('Rejada', movement.from_stage)
        self.assertIn('Kassadan chiqdi', movement.to_stage)

    def test_drag_and_drop_stage_movement(self):
        tx = FinanceTransaction.objects.create(
            shop=self.shop, tx_type='income', stage='planned',
            amount=Decimal('8000000'), title='Kutilayotgan tushum'
        )
        res = self.client.post(reverse('seller_finance_web'), {
            'action': 'move_transaction',
            'tx_id': tx.id,
            'target_stage': 'income',
            'note': 'Mijoz to\'lovni qildi'
        }, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])

        tx.refresh_from_db()
        self.assertEqual(tx.stage, 'income')
        self.assertEqual(tx.tx_type, 'income')
        self.assertTrue(tx.is_moved)
        self.assertEqual(tx.movements.count(), 1)

    def test_excel_export_view(self):
        FinanceTransaction.objects.create(
            shop=self.shop, tx_type='income', stage='income',
            amount=Decimal('15000000'), title='Kassa savdosi'
        )
        res = self.client.get(reverse('finance_export_excel'))
        self.assertEqual(res.status_code, 200)
        self.assertIn('text/csv', res['Content-Type'])
        content = res.content.decode('utf-8-sig')
        self.assertIn('15000000', content)
        self.assertIn('Kassa savdosi', content)

    def test_pdf_export_view(self):
        FinanceTransaction.objects.create(
            shop=self.shop, tx_type='expense', stage='expense',
            amount=Decimal('2500000'), title='Parranda go\'shti'
        )
        res = self.client.get(reverse('finance_export_pdf') + '?period=today')
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'Test Choyxona')
        self.assertContains(res, 'Parranda go&#x27;shti')

    def test_install_preset(self):
        res = self.client.post(reverse('finance_install_preset'), {
            'preset_type': 'choyxona'
        }, HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertTrue(FinanceCategory.objects.filter(shop=self.shop, name__icontains='Dumg\'aza').exists())

    def test_debt_record(self):
        debt = DebtRecord.objects.create(
            shop=self.shop, debt_type='customer', person_name='Alisher aka',
            amount=Decimal('500000'), status='pending'
        )
        self.assertEqual(debt.remaining_amount, Decimal('500000'))
        
        debt.paid_amount = Decimal('500000')
        debt.status = 'settled'
        debt.save()
        self.assertEqual(debt.remaining_amount, Decimal('0'))

    def test_parse_uzbek_amount(self):
        self.assertEqual(parse_uzbek_amount('3 mln 500 ming'), 3_500_000)
        self.assertEqual(parse_uzbek_amount('250 ming'), 250_000)
        self.assertEqual(parse_uzbek_amount('45000'), 45_000)

    def test_ai_copilot_fallback_parsing(self):
        raw_text = "Bugun 20 kg go'sht 1.5 mln ga oldik, 200 ming piyozga berdim, kassa 4 mln tushdi"
        res = process_finance_ai_query(self.shop, raw_text, user=self.user)
        self.assertTrue(res['success'])
        self.assertGreater(res['created_count'], 0)
        self.assertGreater(res['total_income'], 0)
        self.assertGreater(res['total_expense'], 0)

    def test_order_auto_finance_recording(self):
        from orders.models import Order
        from finance.services.order_integration import record_order_payment_income

        order = Order.objects.create(
            order_number='ORD-FIN-001',
            shop=self.shop,
            customer_name='Sobir Aka',
            customer_phone_1='+998901112233',
            total_amount=Decimal('350000'),
            final_amount=Decimal('350000'),
            status='delivered',
            payment_status='paid'
        )
        tx = record_order_payment_income(order)
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount, Decimal('350000'))
        self.assertEqual(tx.tx_type, 'income')
        self.assertEqual(tx.order, order)

        # Idempotency test: calling again must not create duplicate transaction
        tx2 = record_order_payment_income(order)
        self.assertIsNone(tx2)
        self.assertEqual(FinanceTransaction.objects.filter(order=order).count(), 1)

    def test_pay_debt_partial_and_full(self):
        # 1. Customer debt (Nasiya)
        debt = DebtRecord.objects.create(
            shop=self.shop, debt_type='customer', person_name='Sherzod prokuror',
            amount=Decimal('1000000'), status='pending'
        )
        # Partial payment 400 000
        res = self.client.post(reverse('seller_finance_web'), {
            'action': 'pay_debt',
            'debt_id': debt.id,
            'pay_amount': '400 000',
            'payment_method': 'cash',
            'note': 'Birinchi bo\'lib to\'lash'
        })
        self.assertEqual(res.status_code, 302)
        debt.refresh_from_db()
        self.assertEqual(debt.paid_amount, Decimal('400000'))
        self.assertEqual(debt.remaining_amount, Decimal('600000'))
        self.assertEqual(debt.status, 'partial')

        # Verify cash income transaction was created automatically
        tx = FinanceTransaction.objects.filter(shop=self.shop, tx_type='income', amount=Decimal('400000')).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.payment_method, 'cash')
        self.assertEqual(tx.stage, 'income')
        self.assertIn('Sherzod prokuror', tx.title)

        # 2. Supplier debt (Bizning qarzimiz)
        sup_debt = DebtRecord.objects.create(
            shop=self.shop, debt_type='supplier', person_name='Go\'sht bazasi',
            amount=Decimal('500000'), status='pending'
        )
        res_sup = self.client.post(reverse('seller_finance_web'), {
            'action': 'pay_debt',
            'debt_id': sup_debt.id,
            'pay_amount': '500 000',
            'payment_method': 'card',
            'note': 'Plastik orqali to\'landi'
        })
        self.assertEqual(res_sup.status_code, 302)
        sup_debt.refresh_from_db()
        self.assertEqual(sup_debt.paid_amount, Decimal('500000'))
        self.assertEqual(sup_debt.status, 'settled')

        # Verify cash expense transaction was created automatically
        tx_sup = FinanceTransaction.objects.filter(shop=self.shop, tx_type='expense', amount=Decimal('500000')).first()
        self.assertIsNotNone(tx_sup)
        self.assertEqual(tx_sup.payment_method, 'card')
        self.assertEqual(tx_sup.stage, 'expense')

    def test_cancel_and_restore_transaction_audit(self):
        tx = FinanceTransaction.objects.create(
            shop=self.shop, tx_type='income', stage='income',
            amount=Decimal('700000'), title='Bekor bo\'ladigan savdo',
            created_by=self.user
        )
        self.assertFalse(tx.is_cancelled)

        # Cancel transaction with reason
        res = self.client.post(reverse('seller_finance_web'), {
            'action': 'cancel_transaction',
            'tx_id': tx.id,
            'reason': 'Mijoz zakazni bekor qildi'
        })
        self.assertEqual(res.status_code, 302)
        tx.refresh_from_db()
        self.assertTrue(tx.is_cancelled)
        self.assertEqual(tx.cancel_reason, 'Mijoz zakazni bekor qildi')
        self.assertEqual(tx.cancelled_by, self.user)
        self.assertIsNotNone(tx.cancelled_at)

        # Verify active transactions filter excludes it
        self.assertFalse(FinanceTransaction.objects.filter(shop=self.shop, is_cancelled=False, pk=tx.id).exists())

        # Restore transaction
        res_rest = self.client.post(reverse('seller_finance_web'), {
            'action': 'restore_transaction',
            'tx_id': tx.id
        })
        self.assertEqual(res_rest.status_code, 302)
        tx.refresh_from_db()
        self.assertFalse(tx.is_cancelled)
        self.assertEqual(tx.cancel_reason, '')
        self.assertTrue(FinanceTransaction.objects.filter(shop=self.shop, is_cancelled=False, pk=tx.id).exists())

    def test_cash_vs_card_aggregates(self):
        FinanceTransaction.objects.create(
            shop=self.shop, tx_type='income', stage='income', payment_method='cash',
            amount=Decimal('1000000'), title='Naqd savdo'
        )
        FinanceTransaction.objects.create(
            shop=self.shop, tx_type='income', stage='income', payment_method='card',
            amount=Decimal('500000'), title='Karta savdo'
        )
        FinanceTransaction.objects.create(
            shop=self.shop, tx_type='expense', stage='expense', payment_method='cash',
            amount=Decimal('300000'), title='Naqd xarajat'
        )
        FinanceTransaction.objects.create(
            shop=self.shop, tx_type='expense', stage='expense', payment_method='card',
            amount=Decimal('100000'), title='Karta xarajat'
        )

        res = self.client.get(reverse('seller_finance_web'))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.context['income_cash'], Decimal('1000000'))
        self.assertEqual(res.context['income_card'], Decimal('500000'))
        self.assertEqual(res.context['expense_cash'], Decimal('300000'))
        self.assertEqual(res.context['expense_card'], Decimal('100000'))
        self.assertEqual(res.context['net_cash'], Decimal('700000'))
        self.assertEqual(res.context['net_card'], Decimal('400000'))

    def test_custom_stage_name_property_and_export_consistency(self):
        stage = FinanceCustomStage.objects.create(
            shop=self.shop,
            name='Usta xizmati',
            stage_key='custom_usta_9999',
            icon='🛠️',
            category_type='expense',
            color='teal'
        )
        tx = FinanceTransaction.objects.create(
            shop=self.shop,
            tx_type='expense',
            stage=stage.stage_key,
            amount=Decimal('800000'),
            title='Santexnik haqi'
        )
        # Verify stage_name property returns the friendly name with icon
        self.assertEqual(tx.stage_name, '🛠️ Usta xizmati')

        # Verify Excel export includes friendly stage name
        res_excel = self.client.get(reverse('finance_export_excel'))
        self.assertEqual(res_excel.status_code, 200)
        content = res_excel.content.decode('utf-8-sig')
        self.assertIn('🛠️ Usta xizmati', content)
        self.assertIn('Santexnik haqi', content)

        # Verify PDF export includes custom expense stage in totals
        res_pdf = self.client.get(reverse('finance_export_pdf') + '?period=today')
        self.assertEqual(res_pdf.status_code, 200)
        self.assertEqual(res_pdf.context['expense_total'], Decimal('800000'))
        self.assertContains(res_pdf, 'Santexnik haqi')

    def test_delete_tx_and_delete_debt_ajax(self):
        tx = FinanceTransaction.objects.create(
            shop=self.shop,
            tx_type='expense',
            stage='expense',
            amount=Decimal('150000'),
            title='Choynak va piyola'
        )
        # AJAX delete_tx
        res_tx = self.client.post(
            reverse('seller_finance_web'),
            {'action': 'delete_tx', 'tx_id': tx.id},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(res_tx.status_code, 200)
        json_data = res_tx.json()
        self.assertTrue(json_data.get('success'))
        tx.refresh_from_db()
        self.assertTrue(tx.is_cancelled)

        # AJAX delete_debt
        debt = DebtRecord.objects.create(
            shop=self.shop,
            debt_type='customer',
            person_name='Akbar aka',
            amount=Decimal('200000')
        )
        res_debt = self.client.post(
            reverse('seller_finance_web'),
            {'action': 'delete_debt', 'debt_id': debt.id},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(res_debt.status_code, 200)
        debt_json = res_debt.json()
        self.assertTrue(debt_json.get('success'))
        self.assertFalse(DebtRecord.objects.filter(pk=debt.id).exists())

    def test_split_debt_creation_on_expense_and_income(self):
        # 1. Expense split debt (paying part to meat supplier, remaining on credit)
        res_exp = self.client.post(reverse('seller_finance_web'), {
            'action': 'add_transaction',
            'title': 'Go\'sht ta\'minoti (qisman to\'landi)',
            'amount': '1 200 000',
            'tx_type': 'expense',
            'stage': 'expense',
            'payment_method': 'cash',
            'has_split_debt': '1',
            'split_debt_amount': '800 000',
            'split_person_name': 'Qassob Botir aka',
            'split_phone': '+998901234567',
            'split_due_date': '2026-09-25'
        })
        self.assertEqual(res_exp.status_code, 302)
        
        # Verify FinanceTransaction created
        tx_exp = FinanceTransaction.objects.filter(shop=self.shop, title='Go\'sht ta\'minoti (qisman to\'landi)').first()
        self.assertIsNotNone(tx_exp)
        self.assertEqual(tx_exp.amount, Decimal('1200000'))
        
        # Verify DebtRecord automatically created for supplier
        debt_supp = DebtRecord.objects.filter(shop=self.shop, person_name='Qassob Botir aka').first()
        self.assertIsNotNone(debt_supp)
        self.assertEqual(debt_supp.debt_type, 'supplier')
        self.assertEqual(debt_supp.amount, Decimal('800000'))
        self.assertEqual(debt_supp.remaining_amount, Decimal('800000'))
        self.assertIn('Go\'sht ta\'minoti', debt_supp.notes)

        # 2. Income split debt (customer pays part now, remaining on credit)
        res_inc = self.client.post(reverse('seller_finance_web'), {
            'action': 'add_transaction',
            'title': 'Banket to\'lovi (avans olindi)',
            'amount': '3 000 000',
            'tx_type': 'income',
            'stage': 'income',
            'payment_method': 'card',
            'has_split_debt': '1',
            'split_debt_amount': '2 000 000',
            'split_person_name': 'Jamshid to\'y egasi',
            'split_phone': '+998917654321'
        })
        self.assertEqual(res_inc.status_code, 302)

        tx_inc = FinanceTransaction.objects.filter(shop=self.shop, title='Banket to\'lovi (avans olindi)').first()
        self.assertIsNotNone(tx_inc)
        self.assertEqual(tx_inc.amount, Decimal('3000000'))

        debt_cust = DebtRecord.objects.filter(shop=self.shop, person_name='Jamshid to\'y egasi').first()
        self.assertIsNotNone(debt_cust)
        self.assertEqual(debt_cust.debt_type, 'customer')
        self.assertEqual(debt_cust.amount, Decimal('2000000'))

    def test_send_telegram_report_action(self):
        # Create some test income and expense
        FinanceTransaction.objects.create(
            shop=self.shop, tx_type='income', stage='income',
            payment_method='cash', amount=Decimal('5000000'), title='Kassa tushumi'
        )
        FinanceTransaction.objects.create(
            shop=self.shop, tx_type='expense', stage='expense',
            payment_method='card', amount=Decimal('1500000'), title='Kartadan mahsulot'
        )
        DebtRecord.objects.create(
            shop=self.shop, debt_type='customer', person_name='Murod',
            amount=Decimal('400000')
        )

        res = self.client.post(
            reverse('seller_finance_web'),
            {'action': 'send_telegram_report'},
            HTTP_X_REQUESTED_WITH='XMLHttpRequest'
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertIn('report_text', data)
        report = data['report_text']
        self.assertIn('Test Choyxona', report)
        self.assertIn('Kassa Kirimi', report)
        self.assertIn('5 000 000', report)
        self.assertIn('Kassa Chiqimi', report)
        self.assertIn('1 500 000', report)
        self.assertIn('Nasiyalar Holati', report)


