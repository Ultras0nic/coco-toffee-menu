export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = Object.freeze(["en", "pt-PT", "es-ES", "zh-Hans"]);
export const LANGUAGE_STORAGE_KEY = "coco-language-v1";

const URL_ALIASES = Object.freeze({
  en: "en",
  pt: "pt-PT",
  "pt-pt": "pt-PT",
  es: "es-ES",
  "es-es": "es-ES",
  zh: "zh-Hans",
  "zh-cn": "zh-Hans",
  "zh-hans": "zh-Hans",
});

export const LANGUAGE_NAMES = Object.freeze({
  en: "English",
  "pt-PT": "Português",
  "es-ES": "Español",
  "zh-Hans": "简体中文",
});

const translations = {
  "pt-PT": {
    "Skip to menu": "Saltar para o menu",
    "Menu": "Menu",
    "Hover for a quick preview and click for full details. Tap to discover on mobile.": "Passe o cursor para uma pré-visualização e clique para ver todos os detalhes. No telemóvel, toque para descobrir.",
    "A little gift in every bite🌼✨": "Um pequeno presente em cada dentada🌼✨",
    "Coco and Toffee slogan": "Slogan da Coco & Toffee",
    "Menu categories and order bag": "Categorias do menu e cesto de encomenda",
    "Order bag": "Cesto de encomenda",
    "Product details": "Detalhes do produto",
    "Close product details": "Fechar detalhes do produto",
    "Close": "Fechar",
    "Photo coming soon": "Fotografia em breve",
    "Explore the menu": "Explore o menu",
    "Choose a menu item": "Escolha um produto",
    "Product photos, flavor notes, textures and allergen details can be added at any time.": "Fotografias, notas de sabor, texturas e informações sobre alergénios podem ser adicionadas a qualquer momento.",
    "Texture": "Textura",
    "Details coming soon": "Detalhes em breve",
    "Allergens": "Alergénios",
    "Please ask before ordering": "Pergunte antes de encomendar",
    "Pricing": "Preços",
    "Custom quote": "Orçamento personalizado",
    "Choose an option": "Escolha uma opção",
    "Mix flavors in this box": "Misturar sabores nesta caixa",
    "Build your box": "Monte a sua caixa",
    "Servings or size needed": "Número de doses ou tamanho pretendido",
    "Occasion": "Ocasião",
    "Design or flavor ideas": "Ideias de decoração ou sabor",
    "Quantity": "Quantidade",
    "Decrease quantity": "Diminuir quantidade",
    "Increase quantity": "Aumentar quantidade",
    "Add to order bag": "Adicionar à encomenda",
    "View order bag": "Ver cesto de encomenda",
    "Your selection": "A sua seleção",
    "Close order bag": "Fechar cesto de encomenda",
    "Your order bag is waiting for something delicious.": "O seu cesto de encomenda está à espera de algo delicioso.",
    "Your saved order bag expired after 3 days of inactivity. Please choose your items again.": "O seu cesto guardado expirou após 3 dias de inatividade. Escolha novamente os produtos.",
    "Browse the menu": "Explorar o menu",
    "Priced items": "Produtos com preço",
    "Bundle savings": "Poupança no pack",
    "Custom items will be priced after we review your request.": "Os produtos personalizados terão preço depois de analisarmos o pedido.",
    "Delivery, tax and final availability are confirmed separately.": "A entrega, os impostos e a disponibilidade final são confirmados separadamente.",
    "Continue to order details": "Continuar para os detalhes da encomenda",
    "Continue browsing": "Continuar a explorar",
    "Step 1 of 2": "Passo 1 de 2",
    "Step 2 of 2": "Passo 2 de 2",
    "Review your request": "Rever o pedido",
    "Contact & fulfillment": "Contacto e entrega",
    "Close order form": "Fechar formulário de encomenda",
    "This is an order request. Your order is not confirmed until Coco & Toffee replies with availability and the final total. No payment is collected on this website.": "Este é um pedido de encomenda. A encomenda só fica confirmada quando a Coco & Toffee responder com a disponibilidade e o total final. Não é efetuado qualquer pagamento neste site.",
    "Continue to contact details": "Continuar para os dados de contacto",
    "Edit order bag": "Editar cesto de encomenda",
    "Name": "Nome",
    "Email": "E-mail",
    "Phone": "Telefone",
    "Requested date": "Data pretendida",
    "Preferred time window": "Horário preferido",
    "For example, 2–4 PM": "Por exemplo, 14h–16h",
    "How would you like to receive it?": "Como pretende receber a encomenda?",
    "Pickup": "Recolha",
    "Ask about delivery": "Pedir informações sobre entrega",
    "Street address": "Morada",
    "Apartment or unit": "Apartamento ou fração",
    "City": "Localidade",
    "State": "Estado",
    "ZIP code": "Código postal",
    "Notes, dietary concerns or special requests": "Notas, restrições alimentares ou pedidos especiais",
    "I have reviewed the allergen information and understand that the kitchen handles multiple allergens.": "Li as informações sobre alergénios e compreendo que são manuseados vários alergénios na cozinha.",
    "Fields marked * are required. Payment is not collected on this website.": "Os campos assinalados com * são obrigatórios. Não é efetuado qualquer pagamento neste site.",
    "Back": "Voltar",
    "Send order request": "Enviar pedido de encomenda",
    "Copy request details": "Copiar detalhes do pedido",
    "Email this request instead": "Enviar este pedido por e-mail",
    "Text this request instead": "Enviar este pedido por SMS",
    "Request prepared": "Pedido preparado",
    "Your request is ready": "O seu pedido está pronto",
    "Review request details": "Rever detalhes do pedido",
    "Email this request": "Enviar este pedido por e-mail",
    "Text this request": "Enviar este pedido por SMS",
    "Copy order details": "Copiar detalhes da encomenda",
    "Return to menu": "Voltar ao menu",
    "Questions before ordering?": "Dúvidas antes de encomendar?",
    "Send us a note": "Envie-nos uma mensagem",
    "Tell us what you have in mind and how we can reach you.": "Conte-nos o que tem em mente e como podemos entrar em contacto.",
    "Or email": "Ou envie um e-mail para",
    "What can we help with?": "Como podemos ajudar?",
    "General question": "Questão geral",
    "Product or allergen question": "Questão sobre um produto ou alergénio",
    "Event or custom order": "Evento ou encomenda personalizada",
    "Wholesale inquiry": "Pedido de informação para revenda",
    "Message": "Mensagem",
    "Send message": "Enviar mensagem",
    "Email this message": "Enviar esta mensagem por e-mail",
    "Text this message": "Enviar esta mensagem por SMS",
    "Ordering, cancellations & privacy": "Encomendas, cancelamentos e privacidade",
    "All requests are subject to availability. Allow at least 3 days for regular items and 7 days for whole cakes and custom desserts. We aim to reply within 24 hours. Pickup details and any delivery charge are confirmed during approval.": "Todos os pedidos estão sujeitos a disponibilidade. Reserve pelo menos 3 dias para produtos regulares e 7 dias para bolos inteiros e sobremesas personalizadas. Procuramos responder no prazo de 24 horas. Os detalhes de recolha e eventuais custos de entrega são confirmados na aprovação.",
    "Submitting the form sends an order request; it does not confirm an order or collect payment. Coco & Toffee will reply by email to confirm availability, the final total and next steps.": "O envio do formulário cria um pedido de encomenda; não confirma a encomenda nem cobra qualquer pagamento. A Coco & Toffee responderá por e-mail para confirmar a disponibilidade, o total final e os passos seguintes.",
    "If you need to cancel or change a request, email us as soon as possible. Any cancellation or refund terms for an approved order will be confirmed before payment is arranged.": "Se precisar de cancelar ou alterar um pedido, envie-nos um e-mail o mais cedo possível. As condições de cancelamento ou reembolso de uma encomenda aprovada serão confirmadas antes do pagamento.",
    "Please review each product’s allergens. Our kitchen handles multiple allergens; we cannot promise an allergen-free environment. Refrigerated and other restricted products are subject to an appropriately approved kitchen and safe handling.": "Consulte os alergénios de cada produto. A nossa cozinha manuseia vários alergénios, pelo que não podemos garantir um ambiente sem alergénios. Os produtos refrigerados e outros produtos sujeitos a restrições dependem de uma cozinha devidamente aprovada e de manuseamento seguro.",
    "We use the contact and fulfillment details you provide to review requests, communicate with you and fulfill approved orders. The order bag is saved on this browser; form drafts are saved for this browser session. Online requests are stored privately with Supabase. Submitting a request does not subscribe you to marketing. Email us with questions about your information.": "Utilizamos os dados de contacto e entrega fornecidos para analisar pedidos, comunicar consigo e preparar encomendas aprovadas. O cesto é guardado neste navegador; os rascunhos dos formulários são guardados durante esta sessão. Os pedidos online são armazenados de forma privada no Supabase. O envio de um pedido não implica a subscrição de comunicações comerciais. Contacte-nos por e-mail se tiver dúvidas sobre os seus dados.",
    "Thank you for considering us. We look forward to hearing from you.": "Agradecemos a sua preferência. Esperamos receber notícias suas.",
    "Please enable JavaScript to explore the interactive menu. The printable menu remains available from Coco & Toffee.": "Ative o JavaScript para explorar o menu interativo. O menu para impressão continua disponível na Coco & Toffee.",
    "Language": "Idioma",
    "View": "Ver",
    "Each": "Por unidade",
    "4-pack": "Caixa de 4",
    "6-pack": "Caixa de 6",
    "Dozen": "Dúzia",
    "4-count assortment": "Sortido de 4",
    "English": "Inglês",
  },
  "es-ES": {
    "Skip to menu": "Saltar al menú", "Menu": "Menú",
    "Hover for a quick preview and click for full details. Tap to discover on mobile.": "Pasa el cursor para ver una vista previa y haz clic para consultar todos los detalles. En el móvil, toca para descubrir.",
    "A little gift in every bite🌼✨": "Un pequeño regalo en cada bocado🌼✨", "Coco and Toffee slogan": "Eslogan de Coco & Toffee",
    "Menu categories and order bag": "Categorías del menú y cesta del pedido", "Order bag": "Cesta del pedido", "Product details": "Detalles del producto",
    "Close product details": "Cerrar los detalles del producto", "Close": "Cerrar", "Photo coming soon": "Foto próximamente", "Explore the menu": "Explora el menú",
    "Choose a menu item": "Elige un producto", "Product photos, flavor notes, textures and allergen details can be added at any time.": "Las fotos, notas de sabor, texturas e información sobre alérgenos pueden añadirse en cualquier momento.",
    "Texture": "Textura", "Details coming soon": "Detalles próximamente", "Allergens": "Alérgenos", "Please ask before ordering": "Consulta antes de hacer el pedido", "Pricing": "Precios", "Custom quote": "Presupuesto personalizado",
    "Choose an option": "Elige una opción", "Mix flavors in this box": "Mezclar sabores en esta caja", "Build your box": "Prepara tu caja", "Servings or size needed": "Raciones o tamaño necesarios", "Occasion": "Ocasión", "Design or flavor ideas": "Ideas de diseño o sabor",
    "Quantity": "Cantidad", "Decrease quantity": "Reducir cantidad", "Increase quantity": "Aumentar cantidad", "Add to order bag": "Añadir a la cesta", "View order bag": "Ver cesta del pedido", "Your selection": "Tu selección", "Close order bag": "Cerrar cesta del pedido",
    "Your order bag is waiting for something delicious.": "Tu cesta está esperando algo delicioso.", "Your saved order bag expired after 3 days of inactivity. Please choose your items again.": "Tu cesta guardada caducó tras 3 días de inactividad. Vuelve a elegir los productos.",
    "Browse the menu": "Explorar el menú", "Priced items": "Productos con precio", "Bundle savings": "Ahorro por formato", "Custom items will be priced after we review your request.": "Los productos personalizados tendrán precio después de revisar la solicitud.",
    "Delivery, tax and final availability are confirmed separately.": "La entrega, los impuestos y la disponibilidad final se confirman por separado.", "Continue to order details": "Continuar a los datos del pedido", "Continue browsing": "Seguir explorando",
    "Step 1 of 2": "Paso 1 de 2", "Step 2 of 2": "Paso 2 de 2", "Review your request": "Revisa tu solicitud", "Contact & fulfillment": "Contacto y entrega", "Close order form": "Cerrar formulario de pedido",
    "This is an order request. Your order is not confirmed until Coco & Toffee replies with availability and the final total. No payment is collected on this website.": "Esta es una solicitud de pedido. El pedido no queda confirmado hasta que Coco & Toffee responda con la disponibilidad y el total final. No se cobra ningún pago en este sitio web.",
    "Continue to contact details": "Continuar a los datos de contacto", "Edit order bag": "Editar cesta del pedido", "Name": "Nombre", "Email": "Correo electrónico", "Phone": "Teléfono", "Requested date": "Fecha solicitada", "Preferred time window": "Horario preferido", "For example, 2–4 PM": "Por ejemplo, de 14:00 a 16:00",
    "How would you like to receive it?": "¿Cómo quieres recibirlo?", "Pickup": "Recogida", "Ask about delivery": "Consultar entrega", "Street address": "Dirección", "Apartment or unit": "Piso o puerta", "City": "Ciudad", "State": "Estado", "ZIP code": "Código postal",
    "Notes, dietary concerns or special requests": "Notas, necesidades alimentarias o peticiones especiales", "I have reviewed the allergen information and understand that the kitchen handles multiple allergens.": "He revisado la información sobre alérgenos y entiendo que en la cocina se manipulan varios alérgenos.",
    "Fields marked * are required. Payment is not collected on this website.": "Los campos marcados con * son obligatorios. No se cobra ningún pago en este sitio web.", "Back": "Atrás", "Send order request": "Enviar solicitud de pedido", "Copy request details": "Copiar los datos de la solicitud", "Email this request instead": "Enviar esta solicitud por correo", "Text this request instead": "Enviar esta solicitud por SMS",
    "Request prepared": "Solicitud preparada", "Your request is ready": "Tu solicitud está lista", "Review request details": "Revisar los datos de la solicitud", "Email this request": "Enviar esta solicitud por correo", "Text this request": "Enviar esta solicitud por SMS", "Copy order details": "Copiar datos del pedido", "Return to menu": "Volver al menú",
    "Questions before ordering?": "¿Preguntas antes de pedir?", "Send us a note": "Envíanos un mensaje", "Tell us what you have in mind and how we can reach you.": "Cuéntanos qué tienes en mente y cómo podemos contactar contigo.", "Or email": "O escribe a", "What can we help with?": "¿En qué podemos ayudarte?",
    "General question": "Pregunta general", "Product or allergen question": "Pregunta sobre un producto o alérgeno", "Event or custom order": "Evento o pedido personalizado", "Wholesale inquiry": "Consulta para venta al por mayor", "Message": "Mensaje", "Send message": "Enviar mensaje", "Email this message": "Enviar este mensaje por correo", "Text this message": "Enviar este mensaje por SMS",
    "Ordering, cancellations & privacy": "Pedidos, cancelaciones y privacidad",
    "All requests are subject to availability. Allow at least 3 days for regular items and 7 days for whole cakes and custom desserts. We aim to reply within 24 hours. Pickup details and any delivery charge are confirmed during approval.": "Todas las solicitudes están sujetas a disponibilidad. Se necesitan al menos 3 días para los productos habituales y 7 días para tartas enteras y postres personalizados. Intentamos responder en 24 horas. Los detalles de recogida y cualquier gasto de entrega se confirman al aprobar el pedido.",
    "Submitting the form sends an order request; it does not confirm an order or collect payment. Coco & Toffee will reply by email to confirm availability, the final total and next steps.": "Enviar el formulario crea una solicitud de pedido; no confirma el pedido ni cobra ningún pago. Coco & Toffee responderá por correo para confirmar la disponibilidad, el total final y los pasos siguientes.",
    "If you need to cancel or change a request, email us as soon as possible. Any cancellation or refund terms for an approved order will be confirmed before payment is arranged.": "Si necesitas cancelar o cambiar una solicitud, escríbenos cuanto antes. Las condiciones de cancelación o reembolso de un pedido aprobado se confirmarán antes de organizar el pago.",
    "Please review each product’s allergens. Our kitchen handles multiple allergens; we cannot promise an allergen-free environment. Refrigerated and other restricted products are subject to an appropriately approved kitchen and safe handling.": "Consulta los alérgenos de cada producto. En nuestra cocina se manipulan varios alérgenos, por lo que no podemos garantizar un entorno libre de alérgenos. Los productos refrigerados y otros productos restringidos dependen de una cocina debidamente autorizada y de una manipulación segura.",
    "We use the contact and fulfillment details you provide to review requests, communicate with you and fulfill approved orders. The order bag is saved on this browser; form drafts are saved for this browser session. Online requests are stored privately with Supabase. Submitting a request does not subscribe you to marketing. Email us with questions about your information.": "Utilizamos los datos de contacto y entrega que facilitas para revisar solicitudes, comunicarnos contigo y preparar los pedidos aprobados. La cesta se guarda en este navegador y los borradores de formularios durante esta sesión. Las solicitudes online se almacenan de forma privada en Supabase. Enviar una solicitud no te suscribe a comunicaciones comerciales. Escríbenos si tienes preguntas sobre tus datos.",
    "Thank you for considering us. We look forward to hearing from you.": "Gracias por tenernos en cuenta. Esperamos saber de ti.", "Please enable JavaScript to explore the interactive menu. The printable menu remains available from Coco & Toffee.": "Activa JavaScript para explorar el menú interactivo. El menú imprimible sigue disponible en Coco & Toffee.",
    "Language": "Idioma", "View": "Ver", "Each": "Por unidad", "4-pack": "Caja de 4", "6-pack": "Caja de 6", "Dozen": "Docena", "4-count assortment": "Surtido de 4", "English": "Inglés",
  },
  "zh-Hans": {
    "Skip to menu": "跳到菜单", "Menu": "菜单", "Hover for a quick preview and click for full details. Tap to discover on mobile.": "将鼠标移到产品上可快速预览，点击可查看完整详情；手机端请轻触查看。",
    "A little gift in every bite🌼✨": "每一口，都是一份小礼物🌼✨", "Coco and Toffee slogan": "Coco & Toffee 品牌标语", "Menu categories and order bag": "菜单分类和订单篮", "Order bag": "订单篮", "Product details": "产品详情", "Close product details": "关闭产品详情", "Close": "关闭",
    "Photo coming soon": "图片即将上线", "Explore the menu": "浏览菜单", "Choose a menu item": "请选择产品", "Product photos, flavor notes, textures and allergen details can be added at any time.": "产品图片、风味说明、口感和过敏原信息会随时更新。", "Texture": "口感", "Details coming soon": "详情即将上线", "Allergens": "过敏原", "Please ask before ordering": "下单前请先咨询", "Pricing": "价格", "Custom quote": "定制报价",
    "Choose an option": "选择规格", "Mix flavors in this box": "此盒混搭口味", "Build your box": "搭配您的礼盒", "Servings or size needed": "所需份数或尺寸", "Occasion": "使用场合", "Design or flavor ideas": "设计或口味想法", "Quantity": "数量", "Decrease quantity": "减少数量", "Increase quantity": "增加数量", "Add to order bag": "加入订单", "View order bag": "查看订单篮", "Your selection": "您的选择", "Close order bag": "关闭订单篮",
    "Your order bag is waiting for something delicious.": "您的订单篮还在等一份美味。", "Your saved order bag expired after 3 days of inactivity. Please choose your items again.": "您保存的订单篮因 3 天未操作而过期，请重新选择产品。", "Browse the menu": "浏览菜单", "Priced items": "已定价产品", "Bundle savings": "组合优惠", "Custom items will be priced after we review your request.": "定制产品将在我们审核申请后报价。", "Delivery, tax and final availability are confirmed separately.": "配送费、适用税费和最终供应情况将另行确认。", "Continue to order details": "继续填写订单详情", "Continue browsing": "继续浏览",
    "Step 1 of 2": "第 1 步，共 2 步", "Step 2 of 2": "第 2 步，共 2 步", "Review your request": "核对订单申请", "Contact & fulfillment": "联系方式和取货/配送", "Close order form": "关闭订单表格",
    "This is an order request. Your order is not confirmed until Coco & Toffee replies with availability and the final total. No payment is collected on this website.": "这是一份订单申请。Coco & Toffee 回复并确认供应情况和最终金额后，订单才算确认。本网站不会收取付款。", "Continue to contact details": "继续填写联系方式", "Edit order bag": "编辑订单篮", "Name": "姓名", "Email": "电子邮箱", "Phone": "电话", "Requested date": "期望日期", "Preferred time window": "期望时间段", "For example, 2–4 PM": "例如：下午 2 点至 4 点", "How would you like to receive it?": "您希望如何领取？", "Pickup": "自取", "Ask about delivery": "咨询配送", "Street address": "街道地址", "Apartment or unit": "公寓或单元号", "City": "城市", "State": "州", "ZIP code": "邮政编码",
    "Notes, dietary concerns or special requests": "备注、饮食顾虑或特殊要求", "I have reviewed the allergen information and understand that the kitchen handles multiple allergens.": "我已阅读过敏原信息，并了解厨房会处理多种过敏原。", "Fields marked * are required. Payment is not collected on this website.": "标有 * 的字段为必填项。本网站不会收取付款。", "Back": "返回", "Send order request": "发送订单申请", "Copy request details": "复制申请详情", "Email this request instead": "改用电子邮件发送", "Text this request instead": "改用短信发送",
    "Request prepared": "申请已准备", "Your request is ready": "您的申请已准备好", "Review request details": "查看申请详情", "Email this request": "通过电子邮件发送申请", "Text this request": "通过短信发送申请", "Copy order details": "复制订单详情", "Return to menu": "返回菜单", "Questions before ordering?": "下单前有问题？", "Send us a note": "给我们留言", "Tell us what you have in mind and how we can reach you.": "请告诉我们您的想法以及方便的联系方式。", "Or email": "或发送电子邮件至", "What can we help with?": "需要我们提供什么帮助？", "General question": "一般问题", "Product or allergen question": "产品或过敏原问题", "Event or custom order": "活动或定制订单", "Wholesale inquiry": "批发咨询", "Message": "留言", "Send message": "发送消息", "Email this message": "通过电子邮件发送", "Text this message": "通过短信发送",
    "Ordering, cancellations & privacy": "订购、取消与隐私",
    "All requests are subject to availability. Allow at least 3 days for regular items and 7 days for whole cakes and custom desserts. We aim to reply within 24 hours. Pickup details and any delivery charge are confirmed during approval.": "所有申请均视供应情况而定。常规产品请至少提前 3 天，整只蛋糕和定制甜点请至少提前 7 天。我们会尽量在 24 小时内回复。自取详情和配送费用会在批准订单时确认。",
    "Submitting the form sends an order request; it does not confirm an order or collect payment. Coco & Toffee will reply by email to confirm availability, the final total and next steps.": "提交表格仅会发送订单申请，并不代表订单已确认，也不会收取付款。Coco & Toffee 将通过电子邮件确认供应情况、最终金额和后续步骤。",
    "If you need to cancel or change a request, email us as soon as possible. Any cancellation or refund terms for an approved order will be confirmed before payment is arranged.": "如需取消或更改申请，请尽快发送电子邮件联系我们。已批准订单的取消或退款条款会在安排付款前确认。",
    "Please review each product’s allergens. Our kitchen handles multiple allergens; we cannot promise an allergen-free environment. Refrigerated and other restricted products are subject to an appropriately approved kitchen and safe handling.": "请查看每款产品的过敏原信息。厨房会处理多种过敏原，无法保证无过敏原环境。冷藏产品及其他受限产品必须在符合要求的厨房中安全制作和处理。",
    "We use the contact and fulfillment details you provide to review requests, communicate with you and fulfill approved orders. The order bag is saved on this browser; form drafts are saved for this browser session. Online requests are stored privately with Supabase. Submitting a request does not subscribe you to marketing. Email us with questions about your information.": "我们会使用您提供的联系和取货/配送信息来审核申请、与您沟通并完成已批准的订单。订单篮保存在此浏览器中；表格草稿仅保存在当前浏览器会话中。在线申请会私密存储在 Supabase。提交申请不会订阅营销信息。如对个人信息有疑问，请发送电子邮件联系我们。",
    "Thank you for considering us. We look forward to hearing from you.": "感谢您考虑 Coco & Toffee，期待您的消息。", "Please enable JavaScript to explore the interactive menu. The printable menu remains available from Coco & Toffee.": "请启用 JavaScript 以浏览互动菜单。您仍可向 Coco & Toffee 索取可打印菜单。", "Language": "语言", "View": "查看", "Each": "单个", "4-pack": "4个装", "6-pack": "6个装", "Dozen": "12个装", "4-count assortment": "4个什锦装", "English": "英文",
  },
};

Object.assign(translations["pt-PT"], {
  "Coco & Toffee | Menu": "Coco & Toffee | Menu",
  "Explore the Coco & Toffee bakery menu. Hover on desktop or tap on mobile to view product details.": "Explore o menu da pastelaria Coco & Toffee. Passe o cursor no computador ou toque no telemóvel para ver os detalhes.",
  "Language: {language}": "Idioma: {language}",
  "{offer} from {price}": "{offer} a partir de {price}",
  "Ordering option coming soon": "Opção de encomenda em breve",
  "Please use the contact form below for this item.": "Utilize o formulário de contacto abaixo para este produto.",
  "Add to quote request": "Adicionar ao pedido de orçamento",
  "Save {amount}": "Poupe {amount}",
  "Choose exactly {target} cookies across 2–3 flavors, with at least 2 of each flavor.": "Escolha exatamente {target} cookies de 2–3 sabores, com pelo menos 2 de cada sabor.",
  "Choose exactly {target} items. The mixed-box price is calculated from the flavors selected.": "Escolha exatamente {target} produtos. O preço da caixa mista é calculado a partir dos sabores selecionados.",
  "{name} quantity": "Quantidade de {name}",
  "Choose 2–3 flavors with at least 2 cookies each. Current total: {total} of {target}.": "Escolha 2–3 sabores com pelo menos 2 cookies de cada. Total atual: {total} de {target}.",
  "Choose exactly {target} items. Current total: {total}.": "Escolha exatamente {target} produtos. Total atual: {total}.",
  "Please review the flavor selection before adding this box.": "Reveja a seleção de sabores antes de adicionar esta caixa.",
  "{total} of {target} selected": "{total} de {target} selecionados",
  "This option saves {amount} compared with individual pricing.": "Esta opção permite poupar {amount} em comparação com o preço individual.",
  "Tell us what you need and we’ll confirm a custom price.": "Diga-nos o que precisa e confirmaremos um preço personalizado.",
  "{offer} pricing saves {amount}.": "O preço de {offer} permite poupar {amount}.",
  "Starting price; the final assortment price depends on your flavor choices.": "Preço inicial; o preço final do sortido depende dos sabores escolhidos.",
  "Your total updates in the order bag.": "O total é atualizado no cesto de encomenda.",
  "Please send us a message for an order with more than 50 selections.": "Envie-nos uma mensagem para uma encomenda com mais de 50 seleções.",
  "{name} added. Your bag has {count} item(s).": "{name} adicionado. O cesto tem {count} produto(s).",
  "Mixed cookies": "Cookies mistos", "Mixed brownies & blondies": "Brownies e blondies mistos", "Mixed jumbo muffins": "Muffins jumbo mistos", "Assorted tartlets": "Tarteletes sortidas", "Mixed box": "Caixa mista", "{count}-pack": "Caixa de {count}",
  "Open order bag, {count} item(s)": "Abrir cesto, {count} produto(s)", "{count} item(s)": "{count} produto(s)",
  "Switch to {offer} and save {amount}": "Mude para {offer} e poupe {amount}", "Decrease {name} quantity": "Diminuir quantidade de {name}", "Increase {name} quantity": "Aumentar quantidade de {name}", "Edit": "Editar", "Remove": "Remover", "Update order bag": "Atualizar cesto",
  "Priced items estimate": "Estimativa dos produtos com preço", "Estimated subtotal": "Subtotal estimado", "custom quote": "orçamento personalizado",
  "Custom dessert requests need at least 7 days’ notice. Availability is confirmed after review.": "As sobremesas personalizadas requerem pelo menos 7 dias de antecedência. A disponibilidade é confirmada após análise.",
  "Please allow at least 3 days for your order. Availability is confirmed after review.": "Reserve pelo menos 3 dias para a encomenda. A disponibilidade é confirmada após análise.",
  "Please review {count} highlighted field(s).": "Reveja {count} campo(s) assinalado(s).", "Servings/size": "Doses/tamanho", "Ideas": "Ideias",
  "Per box": "Por caixa", "Fulfillment": "Entrega", "Delivery": "Entrega", "Preferred time": "Horário preferido", "Delivery address": "Morada de entrega", "Notes": "Notas", "Topic": "Assunto",
  "This is a request, not a confirmed order. Coco & Toffee will reply by email with availability, the final total and next steps. No payment has been collected.": "Este é um pedido, não uma encomenda confirmada. A Coco & Toffee responderá por e-mail com a disponibilidade, o total final e os passos seguintes. Não foi cobrado qualquer pagamento.",
  "Sending took too long. Please try again.": "O envio demorou demasiado. Tente novamente.", "We couldn’t send your request right now.": "Não foi possível enviar o pedido neste momento.",
  "Request received": "Pedido recebido", "Copy required": "É necessário copiar", "Thank you": "Obrigado", "One more step": "Mais um passo", "We received your request": "Recebemos o seu pedido", "Your request has not been sent": "O seu pedido não foi enviado", "Request number: {code}": "Número do pedido: {code}",
  "Please complete the security check before sending.": "Conclua a verificação de segurança antes de enviar.", "Sending…": "A enviar…",
  "Online sending is not connected yet. Copy the request details below and send them directly to Coco & Toffee.": "O envio online ainda não está ligado. Copie os detalhes abaixo e envie-os diretamente à Coco & Toffee.",
  "We’ll review the custom items, confirm availability and reply by email with your quote. No payment has been collected.": "Analisaremos os produtos personalizados, confirmaremos a disponibilidade e responderemos por e-mail com o orçamento. Não foi cobrado qualquer pagamento.",
  "We’ll review availability and reply by email with the final total and next steps. No payment has been collected.": "Analisaremos a disponibilidade e responderemos por e-mail com o total final e os passos seguintes. Não foi cobrado qualquer pagamento.",
  "Too many attempts. Please wait a moment, then try again.": "Demasiadas tentativas. Aguarde um momento e tente novamente.", "The menu or availability changed. Please reopen your bag and review it.": "O menu ou a disponibilidade mudou. Volte a abrir o cesto e reveja-o.", "Your selections are saved; you can retry or copy the order details.": "As seleções estão guardadas; pode tentar novamente ou copiar os detalhes.",
  "Copy was unavailable. Please select and copy the details manually.": "Não foi possível copiar. Selecione e copie os detalhes manualmente.", "Order details copied.": "Detalhes da encomenda copiados.",
  "Online sending is not connected yet, so your message was copied. Paste it into your preferred email or message app.": "O envio online ainda não está ligado, por isso a mensagem foi copiada. Cole-a na aplicação de e-mail ou mensagens que preferir.",
  "Message sent! Thank you — we received your note and will reply using the email you provided.": "Mensagem enviada! Obrigado — recebemos a sua mensagem e responderemos para o e-mail indicado.", "Message sent ✓": "Mensagem enviada ✓", "Your message is still here so you can retry or email it directly.": "A mensagem continua aqui; pode tentar novamente ou enviá-la diretamente por e-mail.",
  "The security check could not load. Please refresh and try again.": "Não foi possível carregar a verificação de segurança. Atualize a página e tente novamente.", "That translation could not load, so the menu is shown in English.": "Não foi possível carregar essa tradução, por isso o menu é apresentado em inglês."
});

Object.assign(translations["es-ES"], {
  "Coco & Toffee | Menu": "Coco & Toffee | Menú", "Explore the Coco & Toffee bakery menu. Hover on desktop or tap on mobile to view product details.": "Explora el menú de Coco & Toffee. Pasa el cursor en el ordenador o toca en el móvil para ver los detalles.", "Language: {language}": "Idioma: {language}", "{offer} from {price}": "{offer} desde {price}",
  "Ordering option coming soon": "Opción de pedido próximamente", "Please use the contact form below for this item.": "Utiliza el formulario de contacto para consultar este producto.", "Add to quote request": "Añadir a la solicitud de presupuesto", "Save {amount}": "Ahorra {amount}",
  "Choose exactly {target} cookies across 2–3 flavors, with at least 2 of each flavor.": "Elige exactamente {target} galletas de 2–3 sabores, con al menos 2 de cada sabor.", "Choose exactly {target} items. The mixed-box price is calculated from the flavors selected.": "Elige exactamente {target} productos. El precio de la caja surtida se calcula según los sabores seleccionados.", "{name} quantity": "Cantidad de {name}",
  "Choose 2–3 flavors with at least 2 cookies each. Current total: {total} of {target}.": "Elige 2–3 sabores con al menos 2 galletas de cada uno. Total actual: {total} de {target}.", "Choose exactly {target} items. Current total: {total}.": "Elige exactamente {target} productos. Total actual: {total}.", "Please review the flavor selection before adding this box.": "Revisa la selección de sabores antes de añadir esta caja.", "{total} of {target} selected": "{total} de {target} seleccionados",
  "This option saves {amount} compared with individual pricing.": "Esta opción ahorra {amount} frente al precio por unidad.", "Tell us what you need and we’ll confirm a custom price.": "Cuéntanos qué necesitas y confirmaremos un precio personalizado.", "{offer} pricing saves {amount}.": "El precio de {offer} ahorra {amount}.", "Starting price; the final assortment price depends on your flavor choices.": "Precio inicial; el precio final del surtido depende de los sabores elegidos.", "Your total updates in the order bag.": "El total se actualiza en la cesta.",
  "Please send us a message for an order with more than 50 selections.": "Envíanos un mensaje para un pedido con más de 50 selecciones.", "{name} added. Your bag has {count} item(s).": "{name} añadido. La cesta contiene {count} producto(s).",
  "Mixed cookies": "Galletas surtidas", "Mixed brownies & blondies": "Brownies y blondies surtidos", "Mixed jumbo muffins": "Muffins jumbo surtidos", "Assorted tartlets": "Tartaletas surtidas", "Mixed box": "Caja surtida", "{count}-pack": "Caja de {count}", "Open order bag, {count} item(s)": "Abrir cesta, {count} producto(s)", "{count} item(s)": "{count} producto(s)",
  "Switch to {offer} and save {amount}": "Cambia a {offer} y ahorra {amount}", "Decrease {name} quantity": "Reducir cantidad de {name}", "Increase {name} quantity": "Aumentar cantidad de {name}", "Edit": "Editar", "Remove": "Eliminar", "Update order bag": "Actualizar cesta",
  "Priced items estimate": "Estimación de productos con precio", "Estimated subtotal": "Subtotal estimado", "custom quote": "presupuesto personalizado", "Custom dessert requests need at least 7 days’ notice. Availability is confirmed after review.": "Los postres personalizados requieren al menos 7 días de antelación. La disponibilidad se confirma tras la revisión.", "Please allow at least 3 days for your order. Availability is confirmed after review.": "Deja al menos 3 días para el pedido. La disponibilidad se confirma tras la revisión.",
  "Please review {count} highlighted field(s).": "Revisa {count} campo(s) resaltado(s).", "Servings/size": "Raciones/tamaño", "Ideas": "Ideas", "Per box": "Por caja", "Fulfillment": "Entrega", "Delivery": "Entrega", "Preferred time": "Horario preferido", "Delivery address": "Dirección de entrega", "Notes": "Notas", "Topic": "Asunto",
  "This is a request, not a confirmed order. Coco & Toffee will reply by email with availability, the final total and next steps. No payment has been collected.": "Esta es una solicitud, no un pedido confirmado. Coco & Toffee responderá por correo con la disponibilidad, el total final y los pasos siguientes. No se ha cobrado ningún pago.", "Sending took too long. Please try again.": "El envío ha tardado demasiado. Inténtalo de nuevo.", "We couldn’t send your request right now.": "No hemos podido enviar la solicitud en este momento.",
  "Request received": "Solicitud recibida", "Copy required": "Es necesario copiar", "Thank you": "Gracias", "One more step": "Un paso más", "We received your request": "Hemos recibido tu solicitud", "Your request has not been sent": "Tu solicitud no se ha enviado", "Request number: {code}": "Número de solicitud: {code}", "Please complete the security check before sending.": "Completa la verificación de seguridad antes de enviar.", "Sending…": "Enviando…",
  "Online sending is not connected yet. Copy the request details below and send them directly to Coco & Toffee.": "El envío online todavía no está conectado. Copia los datos y envíalos directamente a Coco & Toffee.", "We’ll review the custom items, confirm availability and reply by email with your quote. No payment has been collected.": "Revisaremos los productos personalizados, confirmaremos la disponibilidad y responderemos por correo con el presupuesto. No se ha cobrado ningún pago.", "We’ll review availability and reply by email with the final total and next steps. No payment has been collected.": "Revisaremos la disponibilidad y responderemos por correo con el total final y los pasos siguientes. No se ha cobrado ningún pago.",
  "Too many attempts. Please wait a moment, then try again.": "Demasiados intentos. Espera un momento y vuelve a intentarlo.", "The menu or availability changed. Please reopen your bag and review it.": "El menú o la disponibilidad ha cambiado. Abre de nuevo la cesta y revísala.", "Your selections are saved; you can retry or copy the order details.": "Las selecciones están guardadas; puedes volver a intentarlo o copiar los datos.", "Copy was unavailable. Please select and copy the details manually.": "No se ha podido copiar. Selecciona y copia los datos manualmente.", "Order details copied.": "Datos del pedido copiados.",
  "Online sending is not connected yet, so your message was copied. Paste it into your preferred email or message app.": "El envío online todavía no está conectado, así que se ha copiado el mensaje. Pégalo en tu aplicación de correo o mensajería.", "Message sent! Thank you — we received your note and will reply using the email you provided.": "¡Mensaje enviado! Gracias: hemos recibido tu mensaje y responderemos al correo indicado.", "Message sent ✓": "Mensaje enviado ✓", "Your message is still here so you can retry or email it directly.": "El mensaje sigue aquí; puedes volver a intentarlo o enviarlo directamente por correo.", "The security check could not load. Please refresh and try again.": "No se ha podido cargar la verificación de seguridad. Actualiza la página e inténtalo de nuevo.", "That translation could not load, so the menu is shown in English.": "No se ha podido cargar esa traducción, así que el menú se muestra en inglés."
});

Object.assign(translations["zh-Hans"], {
  "Coco & Toffee | Menu": "Coco & Toffee | 菜单", "Explore the Coco & Toffee bakery menu. Hover on desktop or tap on mobile to view product details.": "浏览 Coco & Toffee 烘焙菜单。电脑端悬停或手机端轻触即可查看产品详情。", "Language: {language}": "语言：{language}", "{offer} from {price}": "{offer}，{price}起",
  "Ordering option coming soon": "订购选项即将上线", "Please use the contact form below for this item.": "如需此产品，请使用下方联系表格。", "Add to quote request": "加入报价申请", "Save {amount}": "节省 {amount}", "Choose exactly {target} cookies across 2–3 flavors, with at least 2 of each flavor.": "请从 2–3 种口味中选择正好 {target} 块曲奇，每种至少 2 块。", "Choose exactly {target} items. The mixed-box price is calculated from the flavors selected.": "请选择正好 {target} 件产品。混合装价格按所选口味计算。", "{name} quantity": "{name}数量",
  "Choose 2–3 flavors with at least 2 cookies each. Current total: {total} of {target}.": "请选择 2–3 种口味，每种至少 2 块。当前共 {total}/{target} 块。", "Choose exactly {target} items. Current total: {total}.": "请选择正好 {target} 件。当前共 {total} 件。", "Please review the flavor selection before adding this box.": "加入此盒前，请检查口味选择。", "{total} of {target} selected": "已选 {total}/{target}", "This option saves {amount} compared with individual pricing.": "此规格比单买节省 {amount}。", "Tell us what you need and we’ll confirm a custom price.": "请告诉我们您的需求，我们会确认定制价格。", "{offer} pricing saves {amount}.": "选择{offer}可节省 {amount}。", "Starting price; the final assortment price depends on your flavor choices.": "此为起价；什锦组合最终价格取决于所选口味。", "Your total updates in the order bag.": "订单篮中的总额会自动更新。",
  "Please send us a message for an order with more than 50 selections.": "如订单超过 50 个选项，请直接给我们留言。", "{name} added. Your bag has {count} item(s).": "已加入{name}。订单篮中共有 {count} 件产品。", "Mixed cookies": "混合曲奇", "Mixed brownies & blondies": "混合布朗尼与金发布朗尼", "Mixed jumbo muffins": "混合巨型玛芬", "Assorted tartlets": "什锦小挞", "Mixed box": "混合装", "{count}-pack": "{count}个装", "Open order bag, {count} item(s)": "打开订单篮，共 {count} 件", "{count} item(s)": "{count} 件",
  "Switch to {offer} and save {amount}": "改选{offer}可节省 {amount}", "Decrease {name} quantity": "减少{name}数量", "Increase {name} quantity": "增加{name}数量", "Edit": "编辑", "Remove": "移除", "Update order bag": "更新订单篮", "Priced items estimate": "已定价产品估算", "Estimated subtotal": "预估小计", "custom quote": "定制报价", "Custom dessert requests need at least 7 days’ notice. Availability is confirmed after review.": "定制甜点需至少提前 7 天申请。审核后确认供应情况。", "Please allow at least 3 days for your order. Availability is confirmed after review.": "订单请至少提前 3 天申请。审核后确认供应情况。",
  "Please review {count} highlighted field(s).": "请检查 {count} 个标出的字段。", "Servings/size": "份数/尺寸", "Ideas": "想法", "Per box": "每盒", "Fulfillment": "领取方式", "Delivery": "配送", "Preferred time": "期望时间", "Delivery address": "配送地址", "Notes": "备注", "Topic": "主题", "This is a request, not a confirmed order. Coco & Toffee will reply by email with availability, the final total and next steps. No payment has been collected.": "这是一份申请，并非已确认订单。Coco & Toffee 会通过电子邮件回复供应情况、最终金额和后续步骤。目前未收取任何付款。", "Sending took too long. Please try again.": "发送超时，请重试。", "We couldn’t send your request right now.": "目前无法发送您的申请。",
  "Request received": "申请已收到", "Copy required": "需要复制", "Thank you": "谢谢", "One more step": "还差一步", "We received your request": "我们已收到您的申请", "Your request has not been sent": "您的申请尚未发送", "Request number: {code}": "申请编号：{code}", "Please complete the security check before sending.": "发送前请完成安全验证。", "Sending…": "正在发送…", "Online sending is not connected yet. Copy the request details below and send them directly to Coco & Toffee.": "在线发送尚未连接。请复制下方申请详情并直接发送给 Coco & Toffee。", "We’ll review the custom items, confirm availability and reply by email with your quote. No payment has been collected.": "我们会审核定制产品、确认供应情况，并通过电子邮件回复报价。目前未收取任何付款。", "We’ll review availability and reply by email with the final total and next steps. No payment has been collected.": "我们会审核供应情况，并通过电子邮件回复最终金额和后续步骤。目前未收取任何付款。",
  "Too many attempts. Please wait a moment, then try again.": "尝试次数过多，请稍后再试。", "The menu or availability changed. Please reopen your bag and review it.": "菜单或供应情况已变化，请重新打开订单篮检查。", "Your selections are saved; you can retry or copy the order details.": "您的选择已保存；可以重试或复制订单详情。", "Copy was unavailable. Please select and copy the details manually.": "无法自动复制，请手动选择并复制详情。", "Order details copied.": "订单详情已复制。", "Online sending is not connected yet, so your message was copied. Paste it into your preferred email or message app.": "在线发送尚未连接，因此消息已复制。请粘贴到常用的电子邮件或消息应用中。", "Message sent! Thank you — we received your note and will reply using the email you provided.": "消息已发送！谢谢，我们已经收到留言，并会通过您提供的电子邮箱回复。", "Message sent ✓": "消息已发送 ✓", "Your message is still here so you can retry or email it directly.": "消息仍保留在此处；您可以重试或直接通过电子邮件发送。", "The security check could not load. Please refresh and try again.": "安全验证无法加载，请刷新后重试。", "That translation could not load, so the menu is shown in English.": "该语言无法加载，菜单已改用英文显示。"
});

export function normalizeLocale(value) {
  if (SUPPORTED_LOCALES.includes(value)) return value;
  const normalized = String(value || "").trim().toLowerCase().replaceAll("_", "-");
  if (URL_ALIASES[normalized]) return URL_ALIASES[normalized];
  if (normalized.startsWith("pt")) return "pt-PT";
  if (normalized.startsWith("es")) return "es-ES";
  if (normalized.startsWith("zh")) return "zh-Hans";
  return DEFAULT_LOCALE;
}

export function resolveInitialLocale({ search = "", stored = "", languages = [] } = {}) {
  const requested = new URLSearchParams(search).get("lang");
  if (requested && (URL_ALIASES[String(requested).toLowerCase()] || SUPPORTED_LOCALES.includes(requested))) return normalizeLocale(requested);
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  for (const language of languages) {
    const locale = normalizeLocale(language);
    if (locale !== DEFAULT_LOCALE || String(language).toLowerCase().startsWith("en")) return locale;
  }
  return DEFAULT_LOCALE;
}

export function shortLocale(locale) {
  return ({ en: "en", "pt-PT": "pt", "es-ES": "es", "zh-Hans": "zh" })[normalizeLocale(locale)];
}

export function translate(locale, key, values = {}) {
  let result = translations[normalizeLocale(locale)]?.[key] || key;
  for (const [name, value] of Object.entries(values)) result = result.replaceAll(`{${name}}`, String(value));
  return result;
}

export function formatUsd(cents, locale = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(normalizeLocale(locale), {
    style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
}

export function localizedOfferLabel(offer, locale) {
  const key = offer.id === "quote" ? "Custom quote"
    : offer.id === "assorted-4" ? "4-count assortment"
    : offer.units === 1 ? "Each"
    : offer.units === 4 ? "4-pack"
    : offer.units === 6 ? "6-pack"
    : offer.units === 12 ? "Dozen"
    : offer.label;
  return translate(locale, key);
}

export function overlayCatalog(baseData, overlay, locale) {
  if (locale === DEFAULT_LOCALE) return structuredClone(baseData);
  if (!overlay || overlay.locale !== locale || typeof overlay.categories !== "object" || typeof overlay.products !== "object") {
    throw new Error(`Invalid ${locale} catalog translation`);
  }
  const result = structuredClone(baseData);
  for (const category of result.menuCategories) {
    const categoryText = overlay.categories[category.id];
    if (!categoryText) throw new Error(`Missing ${locale} category ${category.id}`);
    category.name = categoryText.name;
    category.note = categoryText.note;
    for (const item of category.items) {
      const itemText = overlay.products[item.id];
      if (!itemText) throw new Error(`Missing ${locale} product ${item.id}`);
      item.englishAllergens = item.allergens;
      for (const field of ["name", "description", "texture", "allergens"]) item[field] = itemText[field];
    }
  }
  return result;
}
