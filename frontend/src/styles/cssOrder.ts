// Barcha CSS fayllar ESKI tartibda statik ulanadi (TZ: R8-1, "dizayn buzib qo'yma").
//
// Sahifalar React.lazy bilan bo'laklarga bo'lindi, lekin bir nechta fayl bir xil sinf nomini ta'riflaydi
// (.pill-free, .table-status-dot, .form-input, body ...) va tashqi ko'rinish "qaysi fayl keyinroq yuklangani"ga bog'liq edi.
// CSS bo'laklarga bo'linsa, shu tartib o'zgarib, jadval belgilari rangi va sarlavha nuqtasi siljib qolgan edi.
// Shuning uchun CSS avvalgidek bitta faylda, avvalgi tartibda; faqat JavaScript sahifa bo'yicha yuklanadi.
// Tartib: bu ro'yxat (index.css undan oldin, App.css undan keyin ulanadi).
import '../components/ui/DishCard/DishCard.css'
import '../components/ui/Button/Button.css'
import '../components/ui/Badge/Badge.css'
import '../components/ui/CategoryChips/CategoryChips.css'
import '../components/ui/QuantityStepper/QuantityStepper.css'
import '../components/ui/Modal3D/Modal3D.css'
import '../components/ui/SearchBar/SearchBar.css'
import '../components/ui/TableBadge/TableBadge.css'
import '../components/ui/HeaderNav/HeaderNav.css'
import '../components/ui/BottomNav/BottomNav.css'
import '../components/ui/OrderSummary/OrderSummary.css'
import '../components/ui/Toast/Toast.css'
// Brend aloqa bloki (Welcome) va o'chirilgan bo'lim ekrani: faqat tokenlar
import '../components/ui/BrandContact/BrandContact.css'
import '../components/ui/ModuleUnavailable/ModuleUnavailable.css'
import '../components/ui/StaffNavHeader/StaffNavHeader.css'
import '../components/ui/CallWaiterModal/CallWaiterModal.css'
import '../components/ui/DishSheet/DishSheet.css'
import '../components/ui/SettingsSheet/SettingsSheet.css'
import '../components/ui/NFCGatewayModal/NFCGatewayModal.css'
import '../components/ui/QRGeneratorModal/QRGeneratorModal.css'
import '../components/ui/PhotogrammetryStudioModal/PhotogrammetryStudioModal.css'
import '../pages/WelcomePage/WelcomePage.css'
import '../pages/MenuPage/MenuPage.css'
import '../pages/CartPage/CartPage.css'
import '../pages/CheckoutPage/CheckoutPage.css'
import '../showcase/ComponentShowcase.css'
import '../pages/ARMenuPage/ARMenuPage.css'
import '../pages/OrdersPage/OrdersPage.css'
import '../pages/TableHubPage/TableHubPage.css'
import '../pages/ReservationPage/ReservationPage.css'
// Stol bron qilish (/book/) va kirish tugmalari: sinflar `bk-` bilan, faqat tokenlar; Welcome/TableHub/Menyudagi tugma ham shu yerdan
import '../pages/BookingPage/BookingPage.css'
import '../pages/WaiterPanelPage/WaiterPanelPage.css'
import '../pages/HostessDeskPage/HostessDeskPage.css'
import '../pages/KDSPage/KDSPage.css'
import '../pages/FinancePage/FinancePage.css'
import '../pages/AdminDashboardPage/AdminDashboardPage.css'
// Yangi mehmon dizayni (maket ma'qullangan): eski uslublardan KEYIN — eski dizayn o'zgarmaydi
import './welcomeNew.css'
import './designNew.css'
// Fasl ranglari (admin sozlamasi `guest_season`): faqat brend o'zgaruvchilarini almashtiradi, eng oxirida
import './seasons.css'
// Ishtaha qatlami va animatsiya darajasi (`guest_motion`)
import './motion.css'
// Animatsiya qatlami (A: tugma holati, holat sahnalari; B: 3D sahna konteyneri) — src/motion
import '../motion/fx.css'
// Palitra (admin sozlamasi `guest_palette`): klassik yashil-krem (standart) tokenlari; `orange` da hech narsa qilmaydi
import './palette.css'
// Kun/tun rejimi (admin sozlamasi `guest_theme`): faqat `html[data-theme='dark']` bo'lganda ishlaydi, eng oxirida
import './darkTheme.css'
