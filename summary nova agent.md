# Summary — Nova Notes Document Chat

الملف ده ملخص سريع وشامل للمشروع، ومجهز كمان كـ ورقة مراجعة قبل أي Interview.

## 1. فكرة المشروع

Nova Notes هو تطبيق Document Chat أو RAG Assistant.

المستخدم يرفع ملف PDF، والسيستم يقرأ محتوى الملف ويخزنه بطريقة تسمح بالبحث فيه. بعد كده المستخدم يقدر يسأل أسئلة، والمساعد يدور داخل الملف ويرد بناءً على المعلومات الموجودة فيه فقط.

الهدف الأساسي هو منع الموديل من الإجابة من معلوماته العامة، وخليه ملتزم بالمستند المرفوع.

## 2. أهم الوظائف

- رفع ملفات PDF من داخل صندوق الشات.
- استخراج النص من الـ PDF.
- تقسيم النص إلى أجزاء صغيرة.
- تحويل الأجزاء إلى Embeddings.
- تخزين الـ Embeddings داخل Pinecone.
- البحث عن الأجزاء الأقرب للسؤال.
- إرسال النتائج إلى Gemini عشان يصيغ إجابة مفهومة.
- الاحتفاظ بسياق المحادثة باستخدام LangGraph Checkpointer.
- عزل كل ملف عن الملفات القديمة باستخدام Pinecone Namespace.
- إظهار رسائل خطأ واضحة لو مفاتيح البيئة ناقصة أو الملف غير صالح.

## 3. الـ Tech Stack

### Frontend

- React: بناء الواجهة وإدارة الـ state.
- Vite: تشغيل وتجميع تطبيق React بسرعة.
- React Markdown: عرض إجابات المساعد التي تحتوي على Markdown.
- CSS: تصميم واجهة Nova Notes بدون UI framework خارجي.

### Backend

- Node.js: تشغيل JavaScript على السيرفر.
- Express.js: بناء REST API.
- Multer: استقبال ملفات الـ PDF من خلال `multipart/form-data`.
- dotenv: قراءة متغيرات البيئة من ملف `.env`.
- CORS: السماح للواجهة بالتواصل مع السيرفر أثناء التطوير.

### AI و RAG

- Google Gemini: الموديل المسؤول عن فهم السؤال وصياغة الإجابة.
- LangChain: ربط الموديل بالـ tools وتنظيم الـ agent flow.
- LangGraph Checkpoint: حفظ conversation state.
- Pinecone: Vector Database لتخزين والبحث في embeddings.
- Pinecone `llama-text-embed-v2`: موديل الـ embeddings المستخدم في ingestion والبحث.

### Development Tools

- npm لإدارة المكتبات والـ scripts.
- Concurrently لتشغيل الـ frontend والـ backend معًا.
- ESLint لفحص جودة JavaScript وReact.
- Prettier لتنسيق الكود.

## 4. شكل المشروع

```text
nova-document-room/
├── client/
│   ├── src/
│   │   ├── App.jsx          # الواجهة والـ chat/upload logic
│   │   ├── App.css          # تصميم الواجهة
│   │   ├── index.css        # global styles
│   │   └── main.jsx         # React entry point
│   ├── vite.config.js       # Vite proxy للـ API
│   └── package.json
├── server/
│   ├── index.js             # Express server والـ API routes
│   ├── agent.js             # Gemini agent والـ system prompt
│   ├── tools.js             # Pinecone search tool
│   ├── ingest.js            # PDF ingestion pipeline
│   ├── .env.example         # نموذج متغيرات البيئة
│   └── package.json
├── Screenshot_for_the_Agent.png
├── README.md
├── LICENSE
└── package.json
```

## 5. طريقة تشغيل المشروع

من root folder:

```bash
npm install
npm run install:all
npm run dev
```

بعد التشغيل:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

ملف الأسرار يكون داخل:

```text
server/.env
```

مثال بدون أي مفاتيح حقيقية:

```env
GOOGLE_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_pinecone_index_name
```

لا يتم رفع `.env` إلى GitHub، والمفروض نرفع فقط `.env.example`.

## 6. شرح الـ PDF Ingestion Flow

لما المستخدم يختار ملف PDF من زر `+` داخل الشات:

1. React يستقبل الملف من input مخفي.
2. الواجهة تبعته إلى endpoint اسمه `/api/ingest`.
3. Multer يستقبل الملف ويحفظه مؤقتًا داخل نظام التشغيل.
4. السيرفر ينشئ namespace جديد وفريد للملف باستخدام UUID.
5. `PDFLoader` يستخرج النص من الملف.
6. `RecursiveCharacterTextSplitter` يقسم النص إلى chunks.
7. كل chunk يتحول إلى embedding عن طريق Pinecone Embeddings.
8. الـ embeddings تتخزن في Pinecone داخل namespace الخاص بالملف.
9. السيرفر يرجع namespace للواجهة.
10. الواجهة تحفظ namespace وتستخدمه في الأسئلة التالية.
11. بعد انتهاء العملية، الملف المؤقت يتم حذفه من السيرفر.

### لماذا نستخدم chunks؟

إرسال ملف PDF كامل للموديل في كل سؤال غير عملي؛ ممكن يتخطى limits الـ context ويكون مكلف أو بطيء. تقسيم الملف إلى chunks يجعلنا نبحث فقط عن الأجزاء المرتبطة بالسؤال.

الإعداد الحالي:

```js
chunkSize: 1000
chunkOverlap: 200
```

الـ overlap يساعد على عدم قطع الجملة أو الفكرة بين chunk وآخر.

## 7. شرح الـ Chat Flow

1. المستخدم يكتب السؤال.
2. الواجهة تبعته إلى `/api/chat` مع السؤال والـ namespace.
3. السيرفر ينشئ Gemini agent.
4. الـ agent يستخدم search tool للبحث في namespace الخاص بالـ PDF الحالي.
5. Pinecone يرجع أقرب 10 chunks للسؤال.
6. الـ chunks تترسل إلى Gemini كـ context.
7. Gemini يصيغ إجابة قصيرة باللغة المناسبة للمستخدم.
8. الإجابة ترجع للواجهة وتظهر داخل المحادثة.

## 8. لماذا استخدمنا Namespace؟

في البداية كانت كل الملفات تترفع في نفس Pinecone index بدون عزل، فلو رفعت ملفًا جديدًا كان ممكن البحث يرجع نتائج من ملف قديم.

الحل هو إنشاء namespace جديد لكل ملف:

```text
document-UUID-1
document-UUID-2
document-UUID-3
```

وبالتالي الشات يبحث فقط في namespace الذي رجع بعد آخر upload.

دي نقطة مهمة جدًا في الـ Interview لأنها توضح إننا منعنا document mixing أو خلط معلومات ملفات مختلفة.

## 9. دور الـ Agent والـ Tool

الـ Agent هو الجزء الذي ينسق بين Gemini والـ search tool.

الـ Tool اسمه:

```text
search_knowledge_base
```

وظيفته:

- يأخذ query.
- يفتح Pinecone namespace الحالي.
- يعمل similarity search.
- يرجع النصوص القريبة من السؤال.

استخدمنا `zod` لتعريف شكل البيانات المطلوبة للـ tool:

```js
z.object({
  query: z.string(),
})
```

ده يمنع تمرير input غير متوقع للـ tool.

## 10. كيف نمنع الإجابات من خارج الملف؟

استخدمنا system prompt يطلب من Gemini:

- البحث دائمًا قبل الإجابة.
- عدم استخدام المعرفة العامة.
- عدم التخمين.
- الالتزام بالمستند الحالي.
- إرجاع رسالة ثابتة لو لا توجد نتيجة مناسبة.

وكمان الواجهة لا تسمح بإرسال سؤال قبل رفع PDF، والسيرفر يرفض تشغيل البحث لو مفيش namespace.

مهم في الـ Interview تقول إن الـ prompt وحده ليس security boundary كامل؛ الأفضل دائمًا وجود منطق backend يضمن أن البحث يتم في المصدر الصحيح قبل توليد الإجابة.

## 11. أسئلة وأجوبة Interview

### س: احكيلي عن المشروع في دقيقة.

ج: المشروع عبارة عن Document Chat application مبني بفكرة RAG. المستخدم يرفع PDF، السيرفر يستخرج النص ويقسمه إلى chunks، وبعدها يحولها إلى embeddings ويخزنها في Pinecone. لما المستخدم يسأل، بنبحث عن أقرب chunks للسؤال ونبعتها إلى Gemini عشان يجاوب بناءً على محتوى الملف فقط. استخدمت React وVite للواجهة، وNode.js وExpress للـ backend، وLangChain لتنسيق الـ agent والـ tool calling.

### س: يعني إيه RAG؟

ج: RAG اختصار لـ Retrieval-Augmented Generation. بدل ما الموديل يجاوب من معلوماته العامة فقط، بنعمل retrieval من مصدر خارجي مثل PDF أو database، وبعدها نضيف النتائج إلى prompt الموديل عشان يولد إجابة مبنية على المصدر.

### س: ليه استخدمت Pinecone؟

ج: Pinecone Vector Database مناسب لتخزين embeddings وعمل similarity search بسرعة. بدل البحث النصي التقليدي، السؤال يتحول إلى vector ونبحث عن chunks قريبة منه من ناحية المعنى.

### س: إيه الفرق بين database عادية وvector database؟

ج: قاعدة البيانات العادية تبحث غالبًا عن قيم أو كلمات مطابقة، لكن vector database تبحث عن التشابه في المعنى. مثلًا سؤال "إمتى أقدر أقدم؟" ممكن يلاقي chunk فيه "مواعيد التقديم" حتى لو الكلمات مختلفة.

### س: ليه قسمت الـ PDF إلى chunks؟

ج: عشان ما نبعتش الملف كله للموديل في كل سؤال. الـ chunks تقلل حجم الـ context، وتحسن سرعة البحث وجودة النتائج، وتقلل التكلفة.

### س: ليه استخدمت overlap بين الـ chunks؟

ج: عشان نحافظ على سياق الجمل والأفكار التي تقع على حدود chunkين. من غير overlap ممكن معلومة مهمة تتقسم بطريقة تخلي معناها ناقص.

### س: ليه استخدمت Gemini بدل OpenAI؟

ج: استخدمت Gemini لأنه يوفر API مناسب للمشروع وله free tier للتجارب، وLangChain يوفر integration مباشر مع `ChatGoogleGenerativeAI`. تغيير provider كان محدودًا في طبقة الـ model، بينما باقي RAG flow ظل كما هو.

### س: ما وظيفة LangChain هنا؟

ج: LangChain يسهل ربط الـ LLM بالـ tools والـ prompts والـ message history. في المشروع استخدمته لإنشاء agent يستطيع استدعاء Pinecone search tool، ثم استخدام النتائج في الإجابة.

### س: ما هو الـ Tool Calling؟

ج: هو أن الموديل يقرر أنه يحتاج تنفيذ function معينة، مثل البحث في المستند. هنا Gemini يستدعي `search_knowledge_base`، والنتيجة ترجع له ليستخدمها في الإجابة.

### س: كيف منعت خلط ملف بملف آخر؟

ج: أنشأت Pinecone namespace جديد لكل upload باستخدام UUID. الـ namespace يرجع للواجهة، وكل chat request تبعته للسيرفر، فالبحث يتم داخل ملف واحد فقط.

### س: ماذا يحدث لو المستخدم سأل قبل رفع ملف؟

ج: زر الإرسال يكون disabled في الواجهة، والسيرفر أيضًا يتأكد من وجود namespace قبل إنشاء vector store. ده دفاع على مستوى الواجهة والـ backend معًا.

### س: ماذا يحدث لو السؤال غير موجود في الملف؟

ج: search tool يرجع marker اسمه `NO_RELEVANT_DOCUMENT_CONTEXT`، والـ system prompt يطلب من Gemini إرجاع رسالة واضحة بدل التخمين أو استخدام معلومات من خارج الملف.

### س: كيف حافظت على المحادثة؟

ج: استخدمت `MemorySaver` مع `thread_id`. كل document namespace يُستخدم أيضًا كـ session identifier، فكل ملف له conversation context منفصل.

### س: لماذا استخدمت UUID للـ namespace؟

ج: عشان يكون فريدًا ولا يحصل تصادم بين ملفين لهم نفس الاسم. اسم الملف وحده غير كافٍ لأن المستخدم ممكن يرفع ملفين بنفس الاسم.

### س: كيف تعاملت مع رفع الملفات؟

ج: استخدمت Multer مع disk storage مؤقت. حددت النوع ليكون PDF فقط وحجم الملف الأقصى 25 MB. بعد انتهاء ingestion يتم حذف الملف المؤقت.

### س: كيف تحمي API keys؟

ج: لا أضع المفاتيح داخل source code أو frontend. يتم وضعها في `server/.env`، والـ `.env` موجود في `.gitignore`. أرفع فقط `.env.example` بدون قيم حقيقية.

### س: هل تقدر تنشر الـ frontend على GitHub Pages؟

ج: GitHub Pages يستضيف frontend static فقط، لكنه لا يشغل Node.js backend. لذلك نحتاج نشر backend على خدمة مثل Render أو Railway أو Fly.io، وتعديل API URL في frontend ليشير إلى backend المنشور.

### س: ما المشاكل التي واجهتك؟

ج: واجهت مشكلة أن `PINECONE_API_KEY` لم يكن مقروءًا لأن `.env.example` ليس ملف runtime. أيضًا ظهرت مشكلة خلط نتائج الملفات بسبب استخدام namespace واحد. وواجهت React runtime error بسبب `useEffect` كان يرجع قيمة غير صالحة كـ cleanup. تم حل الثلاث مشاكل بملف env صحيح، وعزل namespaces، وكتابة effect بصيغة block لا ترجع قيمة.

### س: كيف تختبر المشروع؟

ج: أشغل ESLint وVite build للواجهة، وأشغل السيرفر وأختبر endpoints. أهم test يدوي هو رفع ملفين بمحتويين مختلفين والتأكد أن كل namespace يرجع إجابات من ملفه فقط.

### س: ما تحسينات مستقبلية ممكن تضيفها؟

ج:

- إضافة authentication للمستخدمين.
- تخزين metadata عن الملفات في database.
- دعم أكثر من ملف داخل workspace واحد باختيار واضح.
- إضافة citations أو page numbers في الإجابة.
- عمل streaming للإجابة بدل انتظارها كاملة.
- إضافة rate limiting وvalidation أقوى للـ API.
- استخدام reranker لتحسين ترتيب نتائج البحث.
- إضافة automated tests للـ ingestion والـ chat routes.
- تنظيف namespaces القديمة بعد مدة معينة.

## 12. إجابة مختصرة عن أهم Design Decision

أهم قرار تصميمي هو فصل الـ retrieval عن generation:

- Pinecone مسؤول عن إيجاد المعلومات.
- Gemini مسؤول عن صياغة الإجابة.
- LangChain مسؤول عن التنسيق بين الاثنين.
- React مسؤول عن تجربة المستخدم.

الفصل ده يجعل تغيير Gemini أو Pinecone في المستقبل أسهل بدون إعادة كتابة التطبيق كله.

## 13. جملة مناسبة للـ CV

```text
Built a source-grounded PDF chat application using React, Node.js, LangChain, Google Gemini, and Pinecone, with document ingestion, semantic search, isolated vector namespaces, and conversational memory.
```

## 14. نقاط لازم أكون فاهمها قبل الانترفيو

- معنى RAG وEmbeddings وVector Search.
- سبب استخدام chunking وoverlap.
- الفرق بين LLM وEmbedding Model.
- دور Pinecone في المشروع.
- دور LangChain والـ tools.
- كيف تم عزل كل ملف عن الآخر.
- كيف يتم تأمين API keys.
- لماذا لا يكفي system prompt وحده لمنع hallucination.
- الفرق بين frontend وbackend والـ API contract بينهما.
- كيفية نشر frontend وbackend بشكل منفصل.
