Phase 1: Planning & Setup (1-Kun)

AIga loyihaning umumiy ko'rinishini tushuntirish va "ground rules" (asosiy qoidalar)ni o'rnatish.

    Step 1: Define Project Scope.

        Action: AIga loyihaning contextini bering. "Create a grocery delivery mobile app using React Native (or Flutter). The context is Uzbekistan's market, so all text must be in Uzbek."

        AI Prompt: "I need to build a mobile app based on a detailed design I will provide screen-by-screen. We will use React Native with Expo and TypeScript. All public-facing text must be in Uzbek. Please set up a basic project structure with standard navigation (Tab Navigation)."

    Step 2: Establish Design System in Code.

        Action: Rang palitrasi va burchak yumaloqligi (radius) qoidalarini AIga componentlar ko'rinishida yozdiring.

        AI Prompt: "Based on this palette (Primary Green: #327F60, Accent Green: #53C488, etc.) and a general border radius of 16px, create a theme.ts file in React Native that stores these values as constants. Also, create standard styled components for ScreenContainer, PrimaryButton, and PrimaryText."

    Step 3: Organize Images.

        Action: Rasmdagi barcha rasm assets'larini (olmalar, sabzavotlar savati, icon'lar) alohida fayllarga ajratib oling va Expo loyihasining assets/images papkasiga joylang.

Phase 2: Core Customer Experience Coding (2-3 Kunlar)

Xaridor uchun eng mavjud sahifalarni AI bilan "vibe" qilib yaratish.

    Step 4: Code the Home Screen (Bosh Sahifa).

        Action: image_9.png dagi "BOSH SAHIFA"ni AIga componentma-component chizdiring.

        AI Prompt: "Let's vibe on the Home Screen. Look at my reference image (image_9.png).

            Create a Header with the 🇺🇿 flag dropdown and profile icon.

            Create the PromoBanner exactly as shown (green background, 'YANGI MEVA-SABZAVOTLAR!' text, orange action button).

            Create the horizontal Categories list using icons we saved.

            Create the StoreCard component with image, name, rating, and distance, then map it into a vertical list."

        Vibe Iteration: "The font size on the banner is too small, make it much larger and bolder, like Figma style. The gap between category icons is too wide."

    Step 5: Code the Product Detail Screen & Quantity Selector (Mahsulot Tavsifi).

        Action: Mahsulot sahifasi (image_10.png) va sonini tanlash logikasini yozish.

        AI Prompt: "Now, look at image_10.png (Product Detail). Create a screen that takes product details as props. Display the large asset image, name ('Yangi Olmalar'), rating, and description in Uzbek. Implement the QuantitySelector (+/- buttons) and make it update a local quantity state. Ostida to'liq kenglikdagi 'Savatga qo'shish' tugmasi bo'lsin."

    Step 6: Code the Cart & Basic State Management (Savatcham).

        Action: Savat sahifasi (image_11.png) va mahsulotlarni qo'shish/o'chirish logikasi.

        AI Prompt: "image_11.png (Savatcham). Setup a basic state (using React Context or simple useState for now) to represent the cart. It should hold an array of products. When 'Savatga qo'shish' is clicked on the detail screen, add it here. The Cart screen should display a list of items with images, 'kg' price, and a trash can icon to remove items."

Phase 3: Secondary Screens & Integration (4-Kun)

Qolgan sahifalar va navigation integratsiyasi.

    Step 7: Code the Order History Screen (Mening Buyurtmalarim).

        Action: Buyurtmalar ro'yxatini (image_12.png) simplified badge'lar bilan yaratish.

        AI Prompt: "image_12.png (Mening Buyurtmalarim). Use styled cards for each order (#ORD-XXXX). The most important part is the status badge. Create a StatusBadge component that takes status ('Yetkazildi', 'Yo'lda') as props and changes its background color based on the design colors we established (Accent Green for Delivered, Orange for Pending)."

    Step 8: Code the Admin Dashboard (simplified metrics).

        Action: Admin panelni (image_13.png) visual metric'lar bilan chizish.

        AI Prompt: "image_13.png (Admin Dashboard). This is for shop managers. Use our green theme. Create the 2x2 grid of metric cards ('UMUMIY SAVDO', 'YANGI BUYURTMALAR', etc. with Uzbek labels). You don't need real chart data yet, just draw the layout. Place simplified, non-functional line chart and donut chart mockups in the respective cards."

    Step 9: Setup Navigation Flow.

        Action: Sahifalarni bir-biriga bog'lash.

        AI Prompt: "Configure the navigation container. The main app should start on the Home screen within a Tab Navigator ('Bosh sahifa', 'Savat', 'Buyurtmalar'). When a product card is tapped on Home, navigate to the Product Detail screen using Stack Navigation. When 'Logout' is tapped on the Profile screen, handle it."

Phase 4: Sifat Nazorati, O'zbek Tili & Polishing (5-Kun)

Ilovani visual ravishda mukammallashtirish va matnlarni tekshirish.

    Step 10: "Visual QA" with AI.

        Action: AIga tayyor ilova screenshotini bering va Figma dizaynlari bilan solishtirishni so'rang.

        AI Prompt: "Here is a screenshot of our Home Screen and Product Detail Screen. Compare it exactly to the Figma design in the image. Look at spacing, font weights, and border radiuses. Give me the CSS fixes to make it closer to the visual reference."

    Step 11: Final O'zbek Tili Audit.

        Action: AIdan barcha matnlarni O'zbek tiliga to'g'ri, professional va xatosiz o'girilganini tekshirishini so'rang.

        AI Prompt: "Go through every string in the app (headers, buttons, Tavsif, etc.). Audit them for grammatical correctness in O'zbek tili. Make sure the labels 'Yetkazildi', 'Tayyorlanmoqda', 'Meva', 'Sabzavot' are used correctly."

    Step 12: Performance "Vibe Check".

        Action: List'lar skrollini va tugmalar javobini tekshirish.

        AI Prompt: "On the Home screen, the horizontal category list and the vertical store list feel laggy. Please optimize them using FlatList with getItemLayout and memoization for the list items."