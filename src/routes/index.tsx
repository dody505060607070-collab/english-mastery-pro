import { createFileRoute, Link } from "@tanstack/react-router";

/**
 * أريد منك إصلاح المشاكل الحالية في نظام المحاضرات/الفيديو فقط، بدون إعادة بناء المشروع أو تغيير أي شيء يعمل بشكل صحيح، لأن رصيد الـ Credits المتاح لدي محدود جدًا (4.9 Credits). المطلوب تنفيذ إصلاحات دقيقة ومباشرة بأقل استهلاك ممكن للـ Credits.

المشكلة الحالية

1. عند تسجيل الدخول/ربط Google Meet داخل الموقع، يتم الربط بشكل طبيعي ويظهر أن الاتصال تم بنجاح.
2. لكن عندما أعمل Share Screen / مشاركة الشاشة لكي تظهر الشاشة للطلاب، نظام التسجيل لا يسجل الشاشة فعليًا.
3. أثناء التسجيل يظهر العداد وكأن التسجيل يعمل، وعند انتهاء التسجيل يتوقف العداد وكأن كل شيء تم تسجيله، لكن عند فتح التسجيل لا توجد أي تسجيلات فعلية أو يكون التسجيل فارغًا.
4. إذا قمت بفتح YouTube أو أي مصدر فيديو/صوت أثناء مشاركة الشاشة، فإن صوت YouTube لا يظهر في التسجيل ولا يصل بالشكل الصحيح للطلاب.
5. المطلوب أن يكون تسجيل المحاضرة حقيقيًا وليس مجرد Timer يعمل بدون Media Stream محفوظ.

المطلوب منك

افحص الكود الحالي أولًا وحدد سبب المشكلة قبل إجراء أي تعديل.

لا تقم بإعادة بناء نظام Google Meet بالكامل، ولا تغير الـ UI، ولا تضف Features جديدة.

أصلح فقط دورة التسجيل الحالية بحيث تكون كالتالي:

Start Recording
→ الحصول على MediaStream فعلي من الشاشة
→ التقاط صوت النظام إذا كان المتصفح/الجهاز يسمح بذلك
→ التقاط الميكروفون عند الحاجة
→ دمج الـ Audio Tracks بشكل صحيح
→ تشغيل MediaRecorder على الـ Stream الصحيح
→ استقبال جميع "dataavailable" chunks
→ عند الضغط على Stop يتم تنفيذ "mediaRecorder.stop()"
→ انتظار وصول آخر chunks
→ إنشاء Blob صحيح
→ حفظ/رفع التسجيل فعليًا
→ ظهور التسجيل للطلاب وتشغيله من داخل الموقع.

مهم جدًا بالنسبة لمشاركة الشاشة

عند استخدام Screen Share، استخدم الطريقة الصحيحة للحصول على:

- Screen Video Track
- System Audio Track عند توفره
- Microphone Audio Track عند الحاجة

ويجب عدم افتراض أن صوت النظام متاح دائمًا؛ لأن دعم System Audio يختلف حسب المتصفح والجهاز وطريقة مشاركة الشاشة.

إذا كان المتصفح يعرض للمستخدم خيار:
Share audio / مشاركة صوت التبويب أو النظام

اجعل النظام يستفيد منه بدل تجاهله.

إذا كان المستخدم يشارك Chrome Tab وفيه YouTube، يجب التقاط صوت الـ Tab إذا كان المتصفح يسمح بذلك.

مشكلة YouTube والصوت

اختبر تحديدًا السيناريو التالي:

1. بدء المحاضرة.
2. Start Recording.
3. Share Screen.
4. اختيار Chrome Tab أو الشاشة بالطريقة المناسبة.
5. فتح YouTube.
6. تشغيل فيديو.
7. التأكد أن صوت YouTube يتم التقاطه عندما يتيح المتصفح ذلك.
8. إيقاف التسجيل.
9. تشغيل التسجيل الناتج والتأكد أن الفيديو والصوت موجودان.

إذا كان المتصفح يمنع التقاط صوت النظام في حالة معينة، لا تعمل Hack أو حل وهمي؛ اعرض للمستخدم الطريقة الصحيحة التي يجب أن يختار بها مصدر المشاركة للحصول على الصوت.

أهم نقطة

لا تجعل العداد هو دليل أن التسجيل يعمل.

العداد يجب أن يبدأ فقط بعد التأكد من أن:

- MediaRecorder بدأ فعليًا.
- يوجد MediaStream صالح.
- يوجد Video Track.
- توجد Audio Tracks إذا كان المطلوب تسجيل الصوت.
- يتم استقبال "dataavailable" events.

وعند انتهاء التسجيل، لا تعتبر التسجيل ناجحًا إلا بعد التأكد أن الـ Blob الناتج حجمه أكبر من صفر وأن التسجيل تم حفظه/رفعه بنجاح.

معالجة الأخطاء

أضف Error Handling واضحًا للحالات التالية:

- المستخدم رفض Screen Share.
- المستخدم أوقف مشاركة الشاشة.
- لا يوجد Audio Track.
- MediaRecorder غير مدعوم.
- فشل إنشاء MediaStream.
- فشل رفع التسجيل.
- التسجيل الناتج فارغ.
- فشل تشغيل التسجيل.

وفي حالة فشل التسجيل، لا تعرض للمستخدم أن التسجيل نجح.

مهم جدًا لتوفير الـ Credits

لا تعمل Refactor شامل للمشروع.

لا تغير قاعدة البيانات إلا إذا كان ذلك ضروريًا جدًا.

لا تغير التصميم.

لا تضف نظام جديد.

لا تغير Google Meet integration بالكامل.

افحص الكود الموجود وأصلح الـ Recording Pipeline الحالية بأقل عدد ممكن من التعديلات.

اختبار نهائي إجباري

بعد الإصلاح اختبر عمليًا:

Test 1: مشاركة الشاشة + تسجيل الفيديو.

Test 2: مشاركة الشاشة + ميكروفون.

Test 3: مشاركة Chrome Tab + YouTube + صوت التبويب، إذا كان المتصفح يدعم ذلك.

Test 4: إيقاف التسجيل ثم التأكد أن الملف الناتج ليس فارغًا.

Test 5: فتح التسجيل من حساب الطالب والتأكد أنه يعمل بالصوت والصورة.

Test 6: إيقاف مشاركة الشاشة أثناء التسجيل والتأكد أن النظام يتعامل مع الحدث بشكل صحيح ولا يحفظ تسجيلًا وهميًا.

لا تعتبر المهمة مكتملة بمجرد أن العداد يعمل. المطلوب أن يكون هناك ملف تسجيل حقيقي قابل للتشغيل ويحتوي على الصورة والصوت المتاحين فعليًا.

وفي النهاية أعطني تقريرًا مختصرًا جدًا يوضح:

- سبب المشكلة.
- الملفات التي تم تعديلها.
- ماذا تم إصلاحه.
- نتيجة الاختبارات.
- هل صوت YouTube/System Audio أصبح يعمل أم أن هناك قيدًا من المتصفح.
 */
// أولًا: لوحة تحكم الأدمن ونظام الصلاحيات
//
// - إعادة بناء لوحة تحكم الأدمن بشكل احترافي وقوي.
// - جعل الأدمن قادرًا على التحكم الكامل في جميع أجزاء المنصة.
// - إضافة نظام Role & Permission System كامل مع صفحة إدارة الأدوار والصلاحيات وتطبيقه فعليًا على كل مسارات لوحة الأدمن.
// - إمكانية إنشاء أدوار متعددة مثل:
//   - Super Admin
//   - Admin
//   - Editor
//   - Teacher
//   - أضيف لوحة تحكم للـ Teacher تعرض كورساتهم ودروسهم والطلاب الملتحقين وتقدمهم مع إجراءات إدارة المحتوى الأساسية.
//   - Student
//   - أي أدوار أخرى مستقبلًا.
// - إمكانية إعطاء أو سحب أي صلاحية من أي مستخدم.
// - إمكانية تحويل الطالب إلى أدمن أو موظف أو أي دور آخر حسب الصلاحيات.
// - عدم السماح لأي مستخدم بالوصول إلى قسم لا يمتلك صلاحية عليه.
// - أفعل Activity Logs لتسجيل جميع عمليات الأدمن مع البحث والتصفية والتصدير، وربط السجل بالمستخدم والوقت والتغيير.
//
// إدارة المستخدمين والطلاب
//
// - عرض جميع المستخدمين والطلاب في لوحة تحكم واحدة.
// - البحث والتصفية والترتيب.
// - عرض بيانات كل مستخدم ونشاطه والكورسات المسجل بها ومستواه وتقدمه.
// - تعديل بيانات المستخدم.
// - حظر وفك حظر المستخدمين.
// - إيقاف الحساب مؤقتًا أو حذفه.
// - إمكانية إعادة تفعيل الحساب.
// - إدارة صلاحيات كل مستخدم بشكل منفصل.
// - عرض سجل نشاط المستخدم بالكامل.
//
// إدارة الكورسات
// أريد نظامًا متكاملًا لإدارة الكورسات يسمح للأدمن بإضافة وتعديل وحذف وإخفاء ونشر الكورسات بسهولة.
//
// ويشمل:
//
// - اسم الكورس.
// - وصف الكورس.
// - صورة الغلاف.
// - المستوى.
// - التصنيف.
// - المدرس.
// - الدروس والوحدات.
// - الفيديوهات.
// - الملفات والمصادر.
// - الاختبارات.
// - الواجبات.
// - الكلمات الجديدة.
// - مدة الكورس.
// - حالة النشر.
// - ترتيب الدروس والوحدات.
// - إمكانية جعل الكورس مجاني أو مدفوع.
// - التحكم في المحتوى بالكامل من لوحة الأدمن.
//
// إدارة المصادر
// إنشاء قسم مستقل لإدارة المصادر، بحيث أستطيع إضافة وتعديل وحذف وترتيب المصادر بحرية.
//
// المصادر يمكن أن تكون:
//
// - ملفات PDF.
// - صور.
// - روابط.
// - فيديوهات.
// - ملفات صوتية.
// - مستندات.
// - روابط خارجية.
//
// ويجب أن أستطيع ربط أي مصدر بكورس أو درس معين.
//
// نظام الكلمات والنطق
// أريد تطوير قسم الكلمات بشكل قوي جدًا.
//
// يستطيع الأدمن إضافة كلمة، ومعها:
//
// - الترجمة.
// - المعنى.
// - المثال.
// - مستوى الكلمة.
// - التصنيف.
// - النطق.
// - الصوت.
// - إمكانية تشغيل الكلمة صوتيًا.
//
// ويجب أن يكون هناك نظام Text-to-Speech بحيث أكتب الكلمة أو الجملة، والنظام يستطيع تحويلها إلى صوت ونطقها تلقائيًا. أضيف ميزة نطق للمفردات داخل قسم Vocabulary مع زر تشغيل صوت لكل كلمة وتسجيل سجل للمحاولات.
//
// ويفضل توفير إمكانية اختيار اللهجة أو نوع النطق الإنجليزي مثل:
//
// - American English
// - British English
//
// مع إمكانية إعادة تشغيل النطق أكثر من مرة.
//
// تطوير تجربة الطالب
// تطوير واجهة الطالب بالكامل لتكون أكثر احترافية وسهولة، مع:
//
// - Dashboard شخصية لكل طالب.
// - نسبة التقدم في الكورسات.
// - الدروس المكتملة.
// - الدروس المتبقية.
// - الكلمات التي تعلمها.
// - نتائج الاختبارات.
// - نقاط أو مستويات تحفيزية.
// - الشهادات عند إكمال الكورس.
// - متابعة آخر درس وصل إليه الطالب.
// - اقتراح الدرس التالي تلقائيًا.
//
// نظام الاختبارات
// تطوير نظام الاختبارات ليكون مرنًا وقابلًا للإدارة من الأدمن:
//
// - إنشاء الاختبارات.
// - إضافة الأسئلة.
// - اختيارات متعددة.
// - صح وخطأ.
// - ترتيب الكلمات.
// - أسئلة استماع.
// - أسئلة نطق.
// - تحديد الإجابة الصحيحة.
// - تحديد وقت السؤال.
// - تحديد درجة كل سؤال.
// - عرض النتائج والتحليل للطالب والأدمن.
//
// الإشعارات
// إضافة نظام إشعارات متكامل:
//
// - إشعارات داخل الموقع.
// - إشعارات عند إضافة كورس جديد.
// - إشعارات عند وجود اختبار.
// - إشعارات عند إكمال درس.
// - إشعارات من الأدمن للطلاب.
// - إمكانية إرسال إشعار لمستخدم محدد أو مجموعة من المستخدمين أو جميع الطلاب.
//
// الإحصائيات والتقارير
// إنشاء Dashboard Analytics قوية للأدمن تعرض:
//
// - عدد المستخدمين.
// - عدد الطلاب.
// - عدد الكورسات.
// - عدد الدروس.
// - أكثر الكورسات مشاهدة.
// - أكثر الكلمات بحثًا.
// - نسب إكمال الكورسات.
// - نتائج الاختبارات.
// - نشاط المستخدمين.
// - المستخدمين النشطين وغير النشطين.
// - إحصائيات يومية وأسبوعية وشهرية.
//
// قاعدة البيانات
// أعيد تنظيم مخطط قاعدة البيانات وربط الكيانات (مستخدمون، كورسات، دروس، اختبارات، مصادر، كلمات، صلاحيات) مع هجرات منظمة دون فقد بيانات.
//
// - منظمة.
// - قابلة للتوسع.
// - آمنة.
// - سريعة.
// - مرتبطة بشكل صحيح بين المستخدمين والكورسات والدروس والاختبارات والمصادر والكلمات والصلاحيات.
// - تصميمها بحيث يمكن إضافة خصائص جديدة مستقبلًا بدون إعادة بناء النظام.
//
// الأمان
// تقوية النظام بالكامل:
//
// - حماية لوحة الأدمن.
// - نظام صلاحيات حقيقي وليس مجرد إخفاء أزرار.
// - حماية API والبيانات.
// - منع المستخدم من الوصول المباشر إلى وظائف غير مسموحة.
// - تسجيل العمليات الحساسة.
// - حماية الحسابات والجلسات.
// - التحقق من جميع المدخلات.
//
// تطوير التصميم
// لا أريد مجرد إصلاح الوظائف الحالية، بل أريد تطوير الموقع بالكامل من ناحية الشكل وتجربة المستخدم.
//
// اجعل التصميم:
//
// - Modern.
// - Professional.
// - سريع.
// - Responsive على الهاتف والتابلت والكمبيوتر.
// - واضح وسهل الاستخدام.
// - مناسب لمنصة تعليم اللغة الإنجليزية.
// - يحتوي على Animations خفيفة واحترافية بدون التأثير على سرعة الموقع.
// - استخدام Cards وCharts وProgress Bars وواجهة Dashboard حديثة.
// - تحسين الألوان والخطوط والمسافات والأيقونات.
// - تحسين جميع الصفحات وليس لوحة الأدمن فقط.
//
// المطلوب النهائي
// لا تكتفِ بتنفيذ النقاط التي ذكرتها فقط.
//
// راجع المشروع بالكامل، واكتشف بنفسك أي وظائف ناقصة أو أخطاء أو أجزاء ضعيفة، وقم بإصلاحها وتطويرها.
//
// أريد أن تتعامل مع المشروع كمنتج حقيقي جاهز للإطلاق، وتضيف من خبرتك أي أفكار أو إمكانيات تجعل المنصة أقوى وأسهل في الاستخدام وأكثر احترافية.
//
// أي جزء حالي ضعيف: طوّره.
// أي وظيفة ناقصة: أضفها.
// أي تصميم غير احترافي: حسّنه.
// أي مشكلة في قاعدة البيانات أو الصلاحيات: أصلحها.
// أي تجربة مستخدم يمكن تحسينها: حسّنها.
//
// المهم جدًا: لا تحذف الوظائف الحالية التي تعمل بشكل صحيح، بل طوّرها وحافظ على البيانات والمحتوى الحالي، واجعل جميع التعديلات متوافقة مع المشروع الحالي.


// Add lesson completion tracking so every finished lesson is saved to my database and reflected instantly in my progress.
// '''Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.'''
//                                         
//                                             
//                                             TRIAL-R3WS-ZS8X-XCX2-SPZT
// Create the student Dashboard page connected to the database showing Today’s Goal, streak, XP, level, completed lessons, and progress bars.
// Implement the Admin Dashboard with full CRUD for users and educational content.
// Add a certificate management section so the admin can create, issue, and revoke certificates for learners.
// Verify that the app compiles and runs by performing a full production build after the TypeScript fixes.
// Enable stricter TypeScript and ESLint rules (including noImplicitAny) so chart props and callback parameters can’t regress.
// Harden the profile subscription date rendering by handling null values with a clear fallback UI and correct formatting.
/*
أريد منك إنشاء منصة تعليم اللغة الإنجليزية احترافية وحديثة جدًا، مستوحاة من فكرة وتنظيم موقع https://english-for-arabs.com/ ولكن ممنوع نسخ التصميم أو الكود أو المحتوى حرفيًا. أريد بناء منصة أصلية أقوى منه من حيث التصميم، تجربة المستخدم، المحتوى، التفاعل، الذكاء الاصطناعي، وتتبع مستوى الطالب.

اسم المشروع مؤقتًا: English Master / English Academy
المنصة موجهة بشكل أساسي للناطقين بالعربية الذين يريدون تعلم الإنجليزية من الصفر حتى الاحتراف.

1. الهوية والتصميم

أنشئ تصميمًا Premium حديثًا جدًا وليس شكل موقع تعليمي تقليدي.

التصميم يجب أن يكون:

- Modern SaaS + EdTech.
- سريع وخفيف جدًا.
- Responsive بنسبة 100% للموبايل والتابلت والكمبيوتر.
- يدعم العربية RTL والإنجليزية LTR.
- إمكانية التبديل بين العربي والإنجليزي.
- Dark Mode + Light Mode.
- واجهة نظيفة ومريحة للعين.
- Animations خفيفة واحترافية.
- Micro-interactions عند الضغط والانتقال وإنهاء الدروس.
- Cards حديثة.
- Progress bars.
- Circular progress.
- Badges.
- Icons احترافية.
- تصميم Mobile First.

لا أريد مبالغة في الـ3D أو المؤثرات التي تجعل الموقع ثقيلًا؛ الأولوية للسرعة وتجربة التعلم.

---

2. الصفحة الرئيسية

أنشئ Landing Page قوية جدًا تحتوي على:

Hero Section جذاب:

"اتعلم الإنجليزية بثقة... من أول كلمة حتى الطلاقة"

عنوان فرعي يوضح أن الطالب يستطيع التعلم خطوة بخطوة حسب مستواه.

أزرار:

- ابدأ التعلم مجانًا
- اختبر مستواك

مع Visual تعليمي احترافي متحرك بشكل خفيف.

بعدها:

لماذا تتعلم معنا؟

بطاقات:

- تعلم من الصفر
- مستويات A1 → C2
- نطق واستماع
- محادثة عملية
- اختبارات تفاعلية
- متابعة تقدمك
- مراجعة ذكية
- AI English Coach

ثم قسم:

اختر مستواك

A1.1 / A1.2
مبتدئ

A2.1 / A2.2
أساسي

B1.1 / B1.2
متوسط

B2.1 / B2.2
متوسط متقدم

C1.1 / C1.2
متقدم

C2.1 / C2.2
إتقان

كل مستوى يظهر:

- نسبة الإنجاز
- عدد الدروس
- المهارات المتاحة
- زر ابدأ

---

3. إنشاء حساب وتسجيل الدخول

اجعل النظام كاملًا.

التسجيل باستخدام:

- رقم الهاتف
- OTP

ويمكن دعم Google Login إذا تم توفيره.

بعد التسجيل يطلب:

- الاسم
- العمر اختياري
- الهدف من تعلم الإنجليزية
- المستوى الحالي
- عدد الدقائق التي يستطيع الدراسة فيها يوميًا

ثم يعمل Onboarding ذكي.

---

4. اختبار تحديد المستوى

هذه من أهم أجزاء المنصة.

أنشئ Placement Test احترافي.

الاختبار يحتوي على:

- Vocabulary
- Grammar
- Reading
- Listening
- Sentence Structure

ويتم حساب النتيجة تلقائيًا.

بعد الاختبار:

"مستواك الحالي: B1"

مع شرح:

- نقاط القوة
- نقاط الضعف
- الكلمات التي تحتاج مراجعتها
- القواعد التي تحتاج تحسينها
- المهارات التي تحتاج تدريبًا

ثم:

"خطة التعلم المقترحة لك"

---

5. لوحة تحكم الطالب Dashboard

بعد تسجيل الدخول تظهر لوحة تحكم شخصية.

تحتوي على:

مرحبًا يا [اسم الطالب]

Today's Goal

مثلاً:
15 دقيقة تعلم اليوم

ثم:

- Daily Streak
- XP
- المستوى
- الدروس المكتملة
- الكلمات التي تم تعلمها
- نسبة التقدم

Progress:

A1 ███████░░░ 70%

ثم:

أكمل من حيث توقفت

يظهر آخر درس فتحه المستخدم.

ثم:

خطة اليوم

- Vocabulary
- Grammar
- Listening
- Reading
- Speaking

ثم:

مراجعة اليوم

الكلمات التي نسيها الطالب.

---

6. نظام المستويات CEFR

أنشئ نظام كامل:

A1.1, A1.2
A2.1, A2.2
B1.1, B1.2
B2.1, B2.2
C1.1, C1.2
C2.1, C2.2

داخل كل مستوى:

Vocabulary
Grammar
Listening
Reading
Speaking
Writing

كل قسم يحتوي على دروس مرتبة.

الدروس المقفلة لا تفتح إلا بعد إكمال المتطلبات.

---

7. نظام الدروس

صفحة الدرس تكون تفاعلية وليس مجرد مقال.

مثلاً درس Vocabulary:

الكلمة:

"Apple"

النطق:
🔊 Apple

المعنى:
تفاحة

Phonetics:
/ˈæpəl/

Example:
"I eat an apple every day."

ثم:

- استمع
- كرر
- اختبر نفسك
- أضف للمفضلة
- أضف إلى الكلمات التي أراجعها

ثم اختبار سريع.

---

8. Vocabulary System

أنشئ قاموسًا ضخمًا داخل الموقع.

البحث عن أي كلمة.

عند فتح الكلمة:

- English word
- Arabic meaning
- Pronunciation
- Phonetics
- Audio
- Example sentences
- Synonyms
- Antonyms
- Word type
- Related words
- Difficulty level

وأضف زر:

"أضف إلى كلماتي"

---

9. Smart Flashcards

أنشئ نظام Flashcards احترافي.

البطاقة تحتوي على الكلمة.

اضغط عليها تظهر:

- المعنى
- النطق
- المثال

ثم:

"هل تذكرت الكلمة؟"

أزرار:

- سهلة
- متوسطة
- صعبة
- نسيتها

استخدم هذه البيانات في نظام مراجعة ذكي Spaced Repetition.

---

10. Grammar Academy

أنشئ قسم Grammar كامل.

مثلاً:

Present Simple
Present Continuous
Past Simple
Past Continuous
Present Perfect
Future
Modal Verbs
Conditionals
Passive Voice
Reported Speech
Articles
Prepositions
Pronouns
Adjectives
Adverbs
Comparatives
Gerunds
Infinitives

كل درس يحتوي على:

شرح بالعربي
Examples
Common Mistakes
Interactive Exercises
Mini Quiz

---

11. Listening

قسم Listening احترافي.

كل درس يحتوي على Audio Player.

المستخدم يستطيع:

- تشغيل الصوت
- إيقافه
- إعادة الجملة
- تغيير السرعة
- إظهار النص
- إخفاء النص
- إظهار الترجمة العربية

ثم أسئلة comprehension.

أضف مستويات:
A1 → C2.

---

12. Reading

أنشئ مكتبة Reading.

قصص قصيرة ومقالات حسب المستوى.

مثلاً:

A1:
قصص بسيطة جدًا.

A2:
مواقف الحياة اليومية.

B1:
قصص ومقالات متوسطة.

B2:
مقالات أكثر تعقيدًا.

C1/C2:
محتوى متقدم.

داخل النص:

- اضغط على أي كلمة لمعرفة معناها.
- تشغيل نطق الكلمة.
- إضافة للمراجعة.

---

13. Speaking

أريد قسم Speaking قوي جدًا.

المستخدم يرى سؤالًا باللغة الإنجليزية.

مثلاً:

"Tell me about your daily routine."

يضغط:

🎤 Start Speaking

ويتحدث.

النظام يحلل:

- Pronunciation
- Fluency
- Grammar
- Vocabulary
- Confidence

ثم يعطي Score.

مثلاً:

Pronunciation: 82%
Grammar: 76%
Vocabulary: 88%
Fluency: 80%

ويعطي نصائح للتحسين.

إذا لم يتوفر Speech AI حقيقي في بيئة التنفيذ، أنشئ النظام بطريقة Modular بحيث يمكن ربط API لاحقًا بدون إعادة بناء المشروع.

---

14. AI English Coach

أضف مدرس إنجليزي بالذكاء الاصطناعي.

اسم الشخصية:

"English Coach"

المستخدم يستطيع التحدث معه أو الكتابة.

مثلاً:
"Let's practice English."

الـAI يبدأ محادثة حسب مستوى الطالب.

إذا أخطأ الطالب:

❌ I go yesterday to school.

يشرح:

Better:
✅ I went to school yesterday.

ثم يشرح الخطأ بالعربية بطريقة بسيطة.

ويغير مستوى المحادثة تلقائيًا حسب أداء الطالب.

---

15. Writing Practice

أنشئ قسم Writing.

يعطي الطالب موضوعًا حسب المستوى.

مثلاً A2:

"Write about your family."

الطالب يكتب.

AI يقوم بتحليل:

- Grammar
- Vocabulary
- Spelling
- Sentence structure

ويعطي:
Score + Corrections + Suggestions.

---

16. Interactive Quizzes

أنشئ نظام اختبارات متطور.

أنواع الأسئلة:

- Multiple Choice
- True / False
- Fill in the blank
- Match
- Arrange words
- Listen and answer
- Translate
- Choose the correct pronunciation

بعد الاختبار:

Score
Correct answers
Wrong answers
Explanation
Weak areas

والطالب يستطيع إعادة الاختبار.

---

17. XP + Gamification

أريد نظام Gamification قوي.

كل نشاط يعطي XP.

مثلاً:

Complete Lesson +20 XP
Quiz +30 XP
Speaking +40 XP
Daily Login +10 XP
7 Day Streak +100 XP

ثم Levels:

Beginner
Learner
Explorer
Achiever
Advanced
Master

مع Badges.

مثلاً:
🔥 7 Day Streak
🏆 Grammar Master
📚 100 Words
🎧 Listening Pro
🎤 Speaking Star

---

18. Daily Streak

اعمل نظام Streak مشابه لتطبيقات تعلم اللغات.

مثلاً:

🔥 12 يوم متواصل

تقويم شهري يوضح الأيام التي درس فيها الطالب.

إذا انقطع يمكن استخدام:

Streak Freeze

إذا تم تفعيلها.

---

19. Leaderboard

أنشئ ترتيبًا تنافسيًا.

Daily
Weekly
Monthly

يعرض:

- Rank
- Name
- XP
- Level

مع إمكانية إخفاء الاسم الحقيقي واستخدام Username.

---

20. Achievements

صفحة كاملة للإنجازات.

الإنجازات المقفلة تظهر بشكل واضح.

مثلاً:

"تعلم أول 100 كلمة"

"أكمل أول مستوى"

"ادرس 30 يومًا"

"حل 1000 سؤال"

---

21. Certificates

بعد إكمال مستوى معين:

يستطيع الطالب الحصول على Certificate.

مثلاً:

Certificate of Completion

Level A1

مع:

- اسم الطالب
- المستوى
- تاريخ الإكمال
- رقم شهادة Unique ID
- QR Code للتحقق
- وصفحة Verify Certificate.

---

22. Search

أنشئ Search Engine داخلي.

البحث عن:

- درس
- كلمة
- قاعدة
- قصة
- استماع
- اختبار

مع نتائج فورية.

---

23. Favorites

المستخدم يستطيع حفظ:

- كلمات
- دروس
- قصص
- قواعد
- تمارين

داخل صفحة:

My Favorites

---

24. Smart Review

أنشئ صفحة:

"راجع الآن"

النظام يختار تلقائيًا الأشياء التي يحتاج الطالب مراجعتها بناءً على:

- أخطائه
- الكلمات التي نسيها
- الدروس القديمة
- نتائج الاختبارات

---

25. Notifications

نظام إشعارات:

"حان وقت درس اليوم 🔥"

"أنت على بعد 20 XP من المستوى التالي"

"لا تخسر الـ12 يوم Streak"

"لديك 15 كلمة للمراجعة اليوم"

---

26. Blog

أنشئ مدونة تعليمية.

Categories:

Grammar
Vocabulary
Speaking
Listening
Study Tips
English for Work
English for Travel
English for Beginners

صفحة المقال تكون SEO Friendly.

---

27. صفحة Resources

قسم موارد يحتوي على:

- English Dictionary
- Common Phrases
- Irregular Verbs
- Phrasal Verbs
- English Pronunciation
- English Tests
- Vocabulary Lists

---

28. Admin Dashboard

هذه نقطة أساسية.

أنشئ لوحة تحكم Admin احترافية.

الإدارة تستطيع:

إضافة مستخدم
تعديل مستخدم
حذف مستخدم
مشاهدة المستخدمين
مشاهدة النشاط

إضافة مستوى.

إضافة درس.

إضافة Vocabulary.

إضافة Grammar.

إضافة Listening.

إضافة Reading.

إضافة Quiz.

إضافة Audio.

إضافة Articles.

إدارة الشهادات.

إدارة Badges.

إدارة XP.

إدارة الإشعارات.

---

29. إدارة الدروس

من لوحة الإدارة:

Create Lesson

الحقول:

Title
Level
Category
Description
Content
Audio
Images
Examples
Exercises
Quiz
Duration
Difficulty

مع إمكانية Draft / Published.

---

30. Analytics

لوحة الإدارة تعرض:

Total Users
Active Users
Lessons Completed
Average Study Time
Most Popular Lessons
Most Difficult Lessons
Quiz Average Score
Most Common Mistakes
User Retention
Daily Active Users

مع Charts واضحة.

---

31. نظام اشتراكات مستقبلي

اجعل النظام جاهزًا لإضافة Premium.

Free:

- عدد محدود من الدروس
- Vocabulary
- Grammar
- Basic Listening

Premium:

- كل الدروس
- AI Coach
- Speaking Analysis
- Writing Correction
- Advanced Tests
- Certificates
- Smart Review

واجعل نظام الدفع Modular حتى يمكن ربط بوابات دفع مصرية أو عالمية لاحقًا.

---

32. قاعدة البيانات

صمم Database منظمة وقابلة للتوسع.

الجداول الأساسية:

Users
Profiles
Levels
Courses
Lessons
Vocabulary
VocabularyReviews
Grammar
ListeningLessons
ReadingLessons
SpeakingSessions
WritingSubmissions
Quizzes
Questions
Answers
Progress
XP
Achievements
Badges
Streaks
Favorites
Certificates
Notifications
Articles
Subscriptions
Payments

مع العلاقات الصحيحة بين الجداول.

---

33. الأمان

أريد:

Authentication آمن.

OTP آمن.

Role Based Access:

Student
Admin
Super Admin

Validation لجميع البيانات.

حماية API.

حماية لوحة الإدارة.

عدم تخزين أي بيانات حساسة بشكل غير آمن.

---

34. SEO

اجعل الموقع قويًا جدًا في SEO.

كل درس له URL مستقل.

مثلاً:

/learn/english/a1/vocabulary/family

وكل مقال له URL مستقل.

أضف:

Meta Title
Meta Description
Open Graph
Sitemap
Robots.txt
Schema Markup
Canonical URLs

واجعل الصفحات قابلة للأرشفة في Google.

---

35. Performance

أريد الموقع سريع جدًا.

استخدم:

Lazy Loading
Image Optimization
Code Splitting
Caching
Optimized Assets

لا تستخدم مؤثرات ثقيلة بلا فائدة.

يجب أن يعمل بشكل ممتاز على موبايلات Android الضعيفة والمتوسطة.

---

36. Mobile Experience

الموبايل ليس مجرد نسخة مصغرة من Desktop.

صمم Mobile UI حقيقي.

Bottom Navigation:

Home
Learn
Practice
Progress
Profile

مع زر واضح لبدء درس اليوم.

---

37. Accessibility

دعم:

Keyboard Navigation
Readable Fonts
High Contrast
ARIA Labels
Audio Controls
Responsive Text

---

38. تجربة المستخدم

أريد رحلة المستخدم كالتالي:

Landing Page
↓
إنشاء حساب
↓
Onboarding
↓
Placement Test
↓
تحديد المستوى
↓
Learning Plan
↓
Dashboard
↓
Daily Lesson
↓
Quiz
↓
XP
↓
Progress
↓
Review
↓
Next Lesson

كل خطوة تكون واضحة جدًا.

---

39. المحتوى التجريبي

لا تنشئ الموقع فارغًا.

أضف بيانات Demo حقيقية للتجربة.

على الأقل:

A1:
30 Vocabulary Lessons
20 Grammar Lessons
15 Listening Lessons
15 Reading Lessons
10 Quizzes

A2:
نفس النظام

B1:
نفس النظام

B2:
نفس النظام

C1:
نفس النظام

C2:
نفس النظام

يمكن استخدام بيانات تجريبية منظمة إذا كان إنشاء المحتوى الكامل غير مناسب، لكن الواجهة يجب أن تكون ممتلئة وقابلة للتجربة.

---

40. أهم نقطة

لا أريد Clone للموقع المرجعي.

أريد استخدامه فقط لفهم فكرة المنصة وتنظيم المحتوى، ثم بناء منتج جديد تمامًا أكثر احترافية وحداثة وتفاعلية.

الموقع المرجعي يعتمد على دروس المفردات والقواعد والاستماع والقراءة والقصص والمستويات، لذلك حافظ على هذه الركائز، لكن أضف فوقها نظام تعلم شخصي، Gamification، Dashboard، اختبارات تحديد المستوى، مراجعة ذكية، Speaking، Writing، AI Coach، Certificates، Leaderboard، Progress Tracking، وAdmin Dashboard.

النتيجة المطلوبة

أريد منك تنفيذ المشروع كاملًا وليس مجرد تصميم صفحات.

كل زر يجب أن يعمل.

كل صفحة يجب أن تكون مرتبطة بالـDatabase.

كل Progress يتم حفظه.

كل Quiz يحسب النتيجة.

كل XP يتم تسجيله.

كل Streak يتم تحديثه.

كل درس يتم تسجيل إتمامه.

كل مستخدم له Dashboard خاص به.

والـAdmin يستطيع التحكم في جميع المحتويات والمستخدمين.

ابدأ أولًا ببناء Architecture قوية للمشروع، ثم Database، ثم Authentication، ثم Dashboard، ثم نظام المستويات والدروس، ثم الاختبارات، ثم Gamification، ثم AI modules، ثم Admin Dashboard.

اهتم جدًا بالتفاصيل الصغيرة، والـUX، والسرعة، والـResponsive Design.

أريد النتيجة النهائية أن تكون منصة تعليم إنجليزية احترافية حقيقية قابلة للإطلاق تجاريًا وليست مجرد Template أو Landing Page.
*/
/*
تطوير شامل ونهائي لمنصة التعليم — نظام الطلاب والأدمن والكورسات والـ Units

أريد منك تطوير المشروع الحالي بالكامل، وليس مجرد تعديل شكلي. راجع المشروع الموجود حاليًا، واكتشف الأخطاء والوظائف الناقصة والمشاكل في تسجيل الدخول والحسابات ولوحة الأدمن والكورسات، ثم أصلحها وأعد بناء الأجزاء الضعيفة بطريقة احترافية.

الهدف أن يتحول المشروع إلى منصة تعليمية حقيقية قوية، منظمة، سهلة الاستخدام، وقابلة للتوسع.

1. نظام إنشاء حساب الطالب

أعد بناء صفحة إنشاء الحساب من الصفر بشكل احترافي.

بيانات الطالب المطلوبة:

- الاسم الكامل.
- رقم الهاتف.
- كلمة المرور.
- تأكيد كلمة المرور.
- صورة الطالب من ملفات الهاتف / Gallery / File Picker.
- اختيار المرحلة أو القسم الدراسي.
- اختيار الصف.
- اختيار الـ Unit أو المستوى إذا كان النظام يعتمد عليه.

مهم جدًا:

لا تجعل حساب الطالب مشابهًا لحساب الأدمن.

عند إنشاء حساب جديد، يجب أن يكون الحساب تلقائيًا:

Student / طالب

ولا يحصل الطالب على أي صلاحيات إدارية.

يجب أن يعمل رفع الصورة فعليًا من الهاتف وليس مجرد زر شكلي.

بعد اختيار الصورة:

- تظهر Preview للصورة.
- إمكانية تغيير الصورة.
- حفظ الصورة في حساب الطالب.
- عرضها في Profile.
- التعامل مع الصور بطريقة مناسبة للموبايل.

2. اختيار المرحلة والقسم أثناء التسجيل

أثناء إنشاء حساب الطالب، أريد أن يختار الطالب القسم/المرحلة التي ينتمي إليها.

اجعل الاختيارات منظمة ومرنة، مثل:

- KG1
- KG2
- Grade 1
- Grade 2
- Grade 3
- Grade 4
- Grade 5
- Grade 6
- وأي مراحل أو أقسام أخرى موجودة بالفعل في المشروع.

لا تضع هذه الأقسام بشكل ثابت داخل الواجهة فقط.

أريد أن تكون الأقسام Dynamic ويتم التحكم فيها من لوحة الأدمن.

يعني الأدمن يستطيع:

- إضافة قسم جديد.
- تعديل اسم القسم.
- حذف القسم.
- ترتيب الأقسام.
- إخفاء/إظهار القسم.
- إضافة Units لكل قسم.

3. نظام Units

كل قسم يجب أن يكون له Units خاصة به.

مثال:

KG1
→ Unit 1
→ Unit 2
→ Unit 3

KG2
→ Unit 1
→ Unit 2
→ Unit 3

Grade 1
→ Unit 1
→ Unit 2
→ Unit 3

وهكذا.

لكن لا تفترض أن كل الأقسام لها نفس عدد الـUnits.

الأدمن هو الذي يحدد:

- عدد الـUnits.
- أسماء الـUnits.
- ترتيبها.
- محتوى كل Unit.
- حالة الـUnit: منشط / غير منشط.

4. المحتوى داخل الـ Unit

أريد أن يكون الأدمن قادرًا على الدخول إلى أي:

Section / Grade
ثم
Unit
ثم إضافة المحتوى الخاص به.

مثال:

KG1
→ Unit 1
→ Grammar
→ Vocabulary
→ Reading
→ Listening
→ Exercises
→ Videos
→ Files
→ Lessons

ويستطيع الأدمن إضافة ما يحتاجه لكل Unit.

لا تجعل المحتوى موحدًا إجباريًا لكل الأقسام.

كل Unit يمكن أن يكون له محتوى مختلف تمامًا.

5. قسم Grammar

أريد نظام Grammar قوي داخل كل Unit.

الأدمن يستطيع إضافة:

- عنوان درس Grammar.
- شرح الدرس.
- أمثلة.
- صور.
- ملفات.
- فيديو.
- تدريبات.
- أسئلة.
- ترتيب الدرس.

ويجب أن يستطيع تعديل وحذف أي محتوى بعد إضافته.

6. الكورسات — إعادة تصميم كاملة

شكل الكورسات الحالي غير احترافي، لذلك أريد إعادة تصميم قسم الكورسات بالكامل.

لا تكتفِ بتغيير الألوان.

أريد UI/UX جديد بالكامل يشبه منصات التعليم الحديثة.

الكورس يظهر بشكل Card احترافي يحتوي على:

- صورة الكورس.
- اسم الكورس.
- المرحلة.
- عدد الـUnits.
- عدد الدروس.
- نسبة تقدم الطالب.
- زر Continue / ابدأ التعلم.
- حالة الكورس.

وعند فتح الكورس:

Course
→ Units
→ Lessons
→ Content

مع تصميم واضح وسهل جدًا على الطالب.

7. لوحة تحكم الأدمن

هذه أهم نقطة.

عند تسجيل الدخول بحساب الأدمن يجب أن تظهر Admin Dashboard حقيقية ومتكاملة، وليس نفس واجهة الطالب.

الأدمن يجب أن يمتلك تحكمًا كاملًا في المنصة.

Dashboard تحتوي على إحصائيات مثل:

- إجمالي الطلاب.
- الطلاب النشطون.
- الطلاب المحظورون.
- عدد الأقسام.
- عدد الكورسات.
- عدد الـUnits.
- عدد الدروس.
- آخر الطلاب المسجلين.
- آخر الأنشطة.

8. إدارة الطلاب

أريد قسم:

Students Management

يستطيع الأدمن من خلاله:

- مشاهدة جميع الطلاب.
- البحث عن طالب.
- فلترة الطلاب حسب القسم.
- فلترة حسب الصف.
- فلترة حسب الحالة.
- فتح Profile الطالب.
- تعديل بيانات الطالب.
- تغيير صورته.
- تغيير القسم.
- تغيير الصف.
- تغيير الـUnit.
- حذف الطالب.
- حظر الطالب.
- إلغاء الحظر.
- إعادة تفعيل الحساب.

قبل الحذف أظهر Confirmation واضح.

9. الحظر

عند حظر الطالب:

- لا يستطيع الدخول للمنصة.
- تظهر له رسالة أن الحساب محظور.
- الأدمن يستطيع إلغاء الحظر في أي وقت.

10. إدارة الأقسام

أضف داخل Admin Dashboard:

Sections / Grades Management

الأدمن يستطيع:

- إنشاء قسم.
- تعديل قسم.
- حذف قسم.
- ترتيب الأقسام.
- إخفاء القسم.
- إظهار القسم.

مثال:

KG1
KG2
Grade 1
Grade 2
Grade 3
...

ولا تجعل عدد الأقسام محدودًا.

11. إدارة الـ Units

داخل كل قسم:

Units Management

الأدمن يستطيع:

- Add Unit.
- Edit Unit.
- Delete Unit.
- Duplicate Unit.
- Reorder Units.
- Activate / Deactivate Unit.

مثال:

Grade 1

Unit 1
Unit 2
Unit 3
Unit 4

وكل Unit له محتواه الخاص.

12. إدارة محتوى الـ Units

داخل كل Unit أريد Content Manager حقيقي.

الأدمن يستطيع إضافة:

- Lesson.
- Grammar.
- Vocabulary.
- Reading.
- Listening.
- Video.
- PDF.
- Image.
- Exercise.
- Quiz.
- Assignment.
- Text lesson.

ويستطيع:

- تعديل المحتوى.
- حذف المحتوى.
- إعادة ترتيبه.
- إخفائه.
- نشره.
- جعله غير منشور.

13. الصلاحيات

اعمل نظام Roles & Permissions حقيقي.

الأدوار الأساسية:

Admin

صلاحيات كاملة.

Student

صلاحيات الطالب فقط.

ولا تسمح للطالب بالوصول إلى أي صفحة Admin حتى لو حاول كتابة رابط لوحة التحكم يدويًا.

طبّق الحماية على مستوى الـBackend وليس الواجهة فقط.

14. تجربة الطالب بعد تسجيل الدخول

بعد تسجيل الطالب الدخول، يجب أن يرى فقط المحتوى الخاص بالقسم/المرحلة التي اختارها.

مثال:

طالب KG1

يدخل إلى:

KG1
→ Units
→ Unit 1
→ Lessons

ولا يرى محتوى Grade 5 أو KG2 مثلًا، إلا إذا سمح الأدمن بذلك.

15. نظام تقدم الطالب

أريد إضافة Progress Tracking.

يتم تسجيل:

- الدروس التي شاهدها الطالب.
- الدروس المكتملة.
- نسبة الإنجاز.
- آخر درس وصل إليه.
- آخر Unit فتحها.

ويظهر للطالب:

Your Progress: 65%

مع Progress Bar احترافي.

16. Profile الطالب

صفحة Profile احترافية تحتوي على:

- صورة الطالب.
- الاسم.
- رقم الهاتف.
- القسم.
- الصف.
- الوحدات.
- نسبة التقدم.
- الدروس المكتملة.
- تاريخ إنشاء الحساب.

17. التصميم

أعد تصميم المشروع بالكامل من ناحية UI/UX.

أريد:

- تصميم تعليمي حديث.
- Responsive 100%.
- Mobile First.
- يعمل بشكل ممتاز على Android.
- يعمل على الكمبيوتر.
- Sidebar احترافي للأدمن.
- Bottom Navigation مناسبة للموبايل عند الحاجة.
- Cards حديثة.
- Animations خفيفة وااحترافية.
- Loading states.
- Empty states.
- Error states.
- Success messages.
- Confirmation dialogs.

لا تستخدم تصميمًا عاديًا أو Template شكله جاهز.

أريد أن يبدو المشروع كمنتج تعليمي احترافي حقيقي.

18. إصلاح المشاكل الحالية

لا تفترض أن النظام الحالي سليم.

راجع المشروع بالكامل وابحث عن:

- مشاكل Login.
- مشاكل Registration.
- مشاكل صلاحيات الأدمن.
- مشاكل قاعدة البيانات.
- مشاكل Routing.
- مشاكل حماية الصفحات.
- مشاكل رفع الصور.
- مشاكل حفظ البيانات.
- مشاكل عرض الكورسات.
- مشاكل الـUnits.
- مشاكل الأقسام.
- مشاكل Mobile UI.
- أي Buttons لا تعمل.
- أي صفحات ناقصة.
- أي بيانات لا يتم حفظها.

ثم أصلحها.

19. قاعدة البيانات

أعد تنظيم قاعدة البيانات بحيث تكون العلاقات واضحة وقابلة للتوسع.

يجب أن تكون هناك علاقات منطقية بين:

Users
Roles
Students
Sections / Grades
Units
Courses
Lessons
Content
Progress
Permissions

ولا تكرر البيانات بدون داعٍ.

اجعل النظام قابلًا لإضافة آلاف الطلاب والأقسام والدروس مستقبلًا.

20. أهم شرط

لا أريد Prototype شكلي.

أريد وظائف حقيقية تعمل.

إذا كان هناك زر:

Add Student

فيجب أن يضيف طالبًا فعليًا إلى قاعدة البيانات.

إذا كان هناك:

Delete Student

فيجب أن يحذف الطالب فعليًا بعد التأكيد.

إذا كان هناك:

Block Student

فيجب أن يمنع الطالب من تسجيل الدخول.

إذا كان هناك:

Add Unit

فيجب أن ينشئ Unit فعلية مرتبطة بالقسم.

إذا كان هناك:

Add Grammar

فيجب أن يحفظ محتوى Grammar داخل الـUnit المحددة.

إذا رفع الطالب صورة:

يجب أن يتم رفعها وحفظها وعرضها فعليًا.

21. اختبار المشروع

بعد تنفيذ التعديلات، اختبر جميع الـFlows من البداية للنهاية:

Student Flow

Create Account
→ Upload Photo
→ Select Grade/Section
→ Select Unit
→ Create Account
→ Login
→ Student Dashboard
→ Course
→ Unit
→ Lesson
→ Complete Lesson
→ Progress Update

Admin Flow

Admin Login
→ Admin Dashboard
→ Students
→ Add/Edit/Delete/Block Student
→ Sections
→ Add/Edit/Delete Section
→ Units
→ Add/Edit/Delete Unit
→ Content
→ Add Grammar/Lesson/Video/PDF/Quiz
→ Edit
→ Delete
→ Publish/Unpublish

تأكد أن كل شيء يعمل فعليًا.

22. ممنوعات مهمة

لا تجعل صفحة الطالب وصفحة الأدمن نفس الشيء.

لا تجعل إنشاء حساب الطالب ينشئ Admin.

لا تضع الأقسام والـUnits بشكل Static داخل الواجهة إذا كان يمكن إدارتها من قاعدة البيانات.

لا تضع Buttons شكلية.

لا تترك أي Feature غير مكتمل.

لا تكتفِ بتحسين التصميم وتترك الـBackend والـDatabase كما هما.

23. المطلوب النهائي

أريد منك تنفيذ كل ما سبق على المشروع الحالي.

وفي نفس الوقت، راجع المشروع كخبير Product Designer + UX/UI Designer + Full-Stack Developer.

إذا وجدت أي شيء ناقص أو غير منطقي أو يمكن تحسينه، قم بتحسينه من نفسك بما يتناسب مع منصة تعليمية احترافية.

لا تنتظر مني أن أحدد لك كل زر وكل صفحة.

أنت مسؤول عن اكتشاف النواقص وإكمالها.

النتيجة المطلوبة: منصة تعليمية احترافية متكاملة، نظام حسابات حقيقي، صلاحيات صحيحة، Admin Dashboard قوية، إدارة طلاب وأقسام وUnits ومحتوى، وكورسات بتصميم ممتاز وتجربة استخدام قوية على الهاتف والكمبيوتر.

ابدأ أولًا بفحص المشروع الحالي بالكامل، ثم أصلح الـArchitecture والـDatabase والـAuthentication والـAuthorization، وبعد ذلك نفّذ الـUI/UX والتحسينات، ثم اختبر كل الـFlows قبل اعتبار المهمة مكتملة. اعمل كل حاجه بكامل
*/

import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, GraduationCap, Users, Star, ArrowLeft, ArrowRight, MessageCircle, Briefcase, Globe, Award, CheckCircle2, Phone, ShieldCheck, Wallet, Image as ImageIcon, Info, Sparkles, HelpCircle, MessageSquare, Zap, Flame, Layers } from "lucide-react";
import logoAsset from "@/assets/logo-transparent.png.asset.json";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent, pickText } from "@/lib/content";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const iconMap: Record<string, any> = {
  Book: BookOpen,
  MessageCircle: MessageCircle,
  GraduationCap: GraduationCap,
  Briefcase: Briefcase,
  Star: Star,
  Globe: Globe,
  Award: Award
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blue Language Academy | Home" },
      { name: "description", content: "The #1 platform for learning English in the Arab world with a modern interactive style." },
      { property: "og:title", content: "Blue Language Academy" },
      { property: "og:description", content: "Learn English in a modern and interactive way" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: siteContent } = useSiteContent();
  const T = (key: string, fallback: string) => pickText(siteContent?.[key], "ar", fallback);
  // Features come ONLY from Admin → Site Content: deleting a key removes the item from the site.
  const features = [1, 2, 3, 4, 5, 6]
    .map((n) => ({
      title: pickText(siteContent?.[`home.feature${n}.title`], "ar", ""),
      desc: pickText(siteContent?.[`home.feature${n}.desc`], "ar", ""),
    }))
    .filter((f) => f.title.trim().length > 0);
  const whatsapp = T("contact.whatsapp", "+201203529460").replace(/[^\d]/g, "");
  const [selectedCourse, setSelectedCourse] = useState<any>(null);


  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, course_categories(name, icon)")
        .eq("is_published", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_categories")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20" dir="ltr">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-24 items-center justify-between">
          <Link to="/" className="flex items-center gap-4 font-bold text-2xl tracking-tight shrink-0">
            <img 
              src={logoAsset.url} 
              alt="Blue Language Academy Logo" 
              className="h-16 md:h-20 w-auto object-contain drop-shadow-sm" 
            />
            <span className="hidden sm:inline-block">Blue Language Academy</span>
          </Link>
          
          <nav className="hidden lg:flex gap-8">
            <Link to="/" className="text-sm font-semibold hover:text-primary transition-colors relative group">
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link to="/courses" className="text-sm font-semibold hover:text-primary transition-colors relative group">
              Courses
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link to="/dashboard" className="text-sm font-semibold hover:text-primary transition-colors relative group">
              Dashboard
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link to="/profile" className="text-sm font-semibold hover:text-primary transition-colors relative group">
              Profile
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link to="/practice" className="text-sm font-semibold hover:text-primary transition-colors relative group">
              Practice
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
          </nav>
          
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/auth" className="hidden sm:block">
              <Button variant="ghost" className="font-bold">Login</Button>
            </Link>
            <Link to="/auth">
              <Button className="font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all px-4 md:px-6 text-sm md:text-base">
                Join Now
              </Button>
            </Link>
            {/* Mobile Menu Trigger */}
            <div className="lg:hidden flex items-center">
              <Button variant="ghost" size="icon" onClick={() => window.location.href='/courses'}>
                <BookOpen className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="container relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex justify-center mb-10">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                  className="relative group"
                >
                  <img 
                    src={logoAsset.url} 
                    alt="Blue Language Academy" 
                    className="h-48 sm:h-64 md:h-96 w-auto object-contain drop-shadow-[0_25px_60px_rgba(88,166,255,0.4)] transition-transform duration-500 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-primary/25 blur-[120px] -z-10 rounded-full scale-150 opacity-60 animate-pulse" />
                </motion.div>
              </div>
              
              <span className="inline-block py-1.5 px-5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6 border border-primary/20 backdrop-blur-sm">
                Blue Language Academy - #1 Platform in the Arab World
              </span>
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-black mb-6 md:mb-8 leading-[1.2] md:leading-[1.15] bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                {T("home.hero.title", "Master English")} <br />
                <span className="text-primary italic">{T("home.hero.subtitle", "Modern & Interactive")}</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4 text-center">
                {T("home.hero.description", "A unique educational experience combining modern technology with the best global curricula. Learn, practice, and speak fluently from anywhere in the world.")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 px-4">
                <Button size="lg" className="h-14 md:h-16 px-8 md:px-10 text-lg md:text-xl font-black w-full sm:w-auto shadow-2xl shadow-primary/30 group relative overflow-hidden">
                  <span className="relative z-10">{T("home.hero.cta", "Register Free Now")}</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </Button>
                <Link to="/placement-test" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="h-14 md:h-16 px-8 md:px-10 text-lg md:text-xl font-black w-full sm:w-auto border-2 hover:bg-primary/5 group">
                    <Sparkles className="ml-2 h-5 md:h-6 w-5 md:w-6 text-primary group-hover:animate-pulse" />
                    Test Your Level
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
          
          {/* Abstract 3D Shapes */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -z-10 animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-[100px] -z-10" />
        </section>

        {/* Categories Section */}
        <section className="py-24 container relative">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-black mb-4">Explore Departments</h2>
              <p className="text-muted-foreground">Choose the path that suits your learning goals</p>
            </div>
            <Button variant="link" className="text-primary font-bold">View All Departments <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 px-4 md:px-0">
            {categories?.map((cat, idx) => {
              const Icon = iconMap[cat.icon || 'Book'] || BookOpen;
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="glass group hover:border-primary/50 transition-all duration-500 cursor-pointer overflow-hidden border-border/40 relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                    <CardContent className="p-8 flex flex-col items-center text-center relative z-10">
                      <div className="bg-primary/10 p-4 rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-500 mb-6">
                        <Icon className="h-10 w-10" />
                      </div>
                      <h3 className="text-xl font-black mb-2">{cat.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">Learn {cat.name} skills using modern scientific methods</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* Features / Why Us — fully driven by Admin → Site Content */}
        {features.length > 0 && (
        <section className="py-20 bg-muted/30 relative">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-2xl sm:text-4xl font-black mb-8 leading-tight">
                  Why <span className="text-primary">Blue Language Academy</span>?
                </h2>
                <div className="space-y-4">
                  {features.map((feature, i) => {
                    const Icon = [CheckCircle2, Users, Award][i % 3] ?? CheckCircle2;
                    return (
                      <div key={i} className="flex gap-4 p-4 rounded-2xl bg-background/60 border border-border/40">
                        <div className="bg-primary/10 p-2 rounded-xl h-fit text-primary">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg mb-1">{feature.title}</h4>
                          {feature.desc && <p className="text-muted-foreground">{feature.desc}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <div className="relative">
                <img
                  src={learningIllustration}
                  alt="Online English lesson with a teacher on a laptop"
                  width={1024}
                  height={1024}
                  loading="lazy"
                  className="w-full rounded-[2rem] border border-border/40 shadow-xl object-cover"
                />
              </div>
            </div>
          </div>
        </section>
        )}


        {/* Course Details Dialog */}
        <Dialog open={!!selectedCourse} onOpenChange={(open) => !open && setSelectedCourse(null)}>
          <DialogContent className="max-w-2xl font-['Cairo']" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">{selectedCourse?.title}</DialogTitle>
              <DialogDescription>
                {selectedCourse?.course_categories?.name} • {selectedCourse?.level}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                {selectedCourse?.thumbnail_url ? (
                  <img src={selectedCourse.thumbnail_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                    <BookOpen size={64} />
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <h4 className="text-lg font-bold flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  About the course
                </h4>
                <p className="text-muted-foreground leading-relaxed">{selectedCourse?.description}</p>
                <div className="p-4 rounded-xl bg-muted/50 border border-border/40">
                  <div className="text-xs text-muted-foreground mb-1">Level</div>
                  <div className="text-xl font-black">{selectedCourse?.level}</div>
                </div>

              </div>
            </div>
            <DialogFooter>
              <Button asChild className="w-full h-12 text-lg font-black">
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`I want to join: ${selectedCourse?.title ?? ""}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contact us on WhatsApp
                </a>
              </Button>
            </DialogFooter>

          </DialogContent>
        </Dialog>

        {/* Featured Courses Section */}
        <section className="py-24 container relative">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-black mb-4 px-4">Blue Language Academy</h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto px-4">Choose from a wide variety of courses designed to suit all levels</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 px-4 md:px-0">
            {courses?.map((course, idx) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card 
                  className="overflow-hidden group hover:shadow-2xl transition-all duration-500 border-border/40 hover:-translate-y-2 cursor-pointer"
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                      toast.error("يرجى تسجيل الدخول أولاً لرؤية تفاصيل الكورس");
                      window.location.href = '/auth';
                      return;
                    }
                    setSelectedCourse(course);
                  }}


                >
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {course.thumbnail_url ? (
                      <img 
                        src={course.thumbnail_url} 
                        alt={course.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                        <BookOpen className="w-16 h-16 text-primary/20" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 z-20">
                      <span className="bg-background/90 backdrop-blur text-primary text-[10px] font-black uppercase px-2 py-1 rounded shadow-sm">
                        {course.level}
                      </span>
                    </div>
                  </div>
                  <CardHeader>
                    <span className="text-xs font-bold text-primary">{course.course_categories?.name}</span>
                    <CardTitle className="text-xl font-black group-hover:text-primary transition-colors">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-2">{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1">
                        <Globe className="h-3.5 w-3.5" />
                        English / Arabic
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        {course.level}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="px-6 border-t mt-4 pt-4 pb-6 flex items-center justify-end">
                    <Button
                      className="font-bold"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCourse(course);
                      }}
                    >
                      View details
                    </Button>
                  </CardFooter>

                </Card>
              </motion.div>
            ))}
            {courses?.length === 0 && (
              <div className="col-span-full">
                <EmptyState 
                  title="No courses available yet!"
                  description="We are currently working on adding new and distinctive educational content. Please come back later to explore our new courses."
                  icon="book"
                  actionText="Contact Us"
                  onAction={() => window.location.href = '/contact'}
                />
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="container max-w-5xl bg-primary rounded-[3rem] p-12 md:p-20 text-center text-primary-foreground relative overflow-hidden shadow-2xl shadow-primary/30"
          >
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-black/10 rounded-full -mr-32 -mb-32 blur-3xl" />
            
            <h2 className="text-3xl md:text-5xl font-black mb-8 relative z-10 px-4">Ready to Start Your Journey?</h2>
            <p className="text-base md:text-xl opacity-90 mb-12 max-w-2xl mx-auto relative z-10 px-4">
              Join more than 10,000 students and start developing your English language skills with the best tools and experts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Button size="lg" variant="secondary" className="h-16 px-10 text-xl font-black">
                Register Your Account Now
              </Button>
              <Button size="lg" variant="outline" className="h-16 px-10 text-xl font-black bg-transparent border-white/30 hover:bg-white/10 text-white">
                Talk to a Consultant
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Community Q&A Section */}
        <section className="py-24 container relative">
          <div className="text-center mb-12 md:mb-16 space-y-4 px-4">
            <h2 className="text-3xl md:text-5xl font-black text-center">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto text-center">Quick answers to your questions about your educational journey with us.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {[
              { q: "How do I start my first lesson?", a: "After logging in, go to the dashboard, choose the course you want, and click on the first lesson." },
              { q: "How can I track my progress?", a: "You can track your detailed performance and learning milestones through your personal dashboard at Blue Language Academy." },
              { q: "How can I contact the teacher?", a: "You can ask your questions in the comments section under each lesson or contact us directly via WhatsApp." },
              { q: "Is there a group discount?", a: "Yes, we provide special discounts for groups and institutions. Please contact the sales team." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="glass p-8 rounded-3xl border-border/40 hover:border-primary/50 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xl font-bold">{item.q}</h4>
                      <p className="text-muted-foreground leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link to="/faq">
              <Button variant="link" className="text-lg font-black text-primary gap-2">
                View All Questions
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* 3D Floating Decorations */}
        <div className="absolute top-[30%] left-10 hidden lg:block opacity-20 rotate-12 animate-float">
          <BookOpen className="w-32 h-32 text-primary" />
        </div>
        <div className="absolute top-[60%] right-10 hidden lg:block opacity-20 -rotate-12 animate-bounce-slow">
          <Sparkles className="w-32 h-32 text-accent" />
        </div>
        <div className="absolute bottom-[10%] left-20 hidden lg:block opacity-20 rotate-45 animate-float-delayed">
          <GraduationCap className="w-32 h-32 text-primary" />
        </div>
      </main>

      <footer className="bg-muted/50 border-t py-12">
        <div className="container grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 px-6 md:px-0">
          <div className="col-span-2">
            <div className="flex items-center gap-2 font-black text-2xl mb-6">
              <div className="bg-primary p-1.5 rounded-lg">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl md:text-2xl">Blue Language Academy</span>
            </div>
            <p className="text-muted-foreground max-w-sm mb-6">
              The leading educational platform in the Arab world for teaching English at all levels and specialties.
            </p>
            <div className="flex gap-4">
              {['facebook', 'twitter', 'instagram', 'youtube'].map((social) => (
                <div key={social} className="w-10 h-10 rounded-full bg-background border flex items-center justify-center cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all">
                  <span className="sr-only">{social}</span>
                  <Globe className="w-5 h-5" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-black mb-6">Quick Links</h4>
            <ul className="space-y-4 text-muted-foreground font-bold text-sm">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/dashboard" className="hover:text-primary transition-colors">Courses</Link></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-6">Legal</h4>
            <ul className="space-y-4 text-muted-foreground font-bold text-sm">
              <li><Link to="/legal/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/legal/terms" className="hover:text-primary transition-colors">Terms of Use</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black mb-6">Connect With Us</h4>
            <ul className="space-y-4 text-muted-foreground font-bold text-sm">
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span>Cairo, Egypt</span>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span>+20 1016177688</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="container border-t mt-12 pt-8 text-center text-sm text-muted-foreground font-bold">
          <p>© 2026 Blue Language Academy. All rights reserved.</p>
        </div>
      </footer>

      {/* Tailwind Custom Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-15px) rotate(0deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
      `}} />
    </div>
  );
}
