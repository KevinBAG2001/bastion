import type { Difficulty } from "@prisma/client";

export type SeedOption = { text: string; isCorrect: boolean };
export type SeedQuestion = {
  text: string;
  explanation: string;
  options: SeedOption[];
};
export type SeedLesson = {
  slug: string;
  title: string;
  summary: string;
  content: string;
};
export type SeedCourse = {
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  sortOrder: number;
  lessons: SeedLesson[];
  quizTitle: string;
  questions: SeedQuestion[];
};

export const courses: SeedCourse[] = [
  {
    slug: "fundamentos-ciberseguridad",
    title: "Fundamentos de ciberseguridad",
    description:
      "Comprende qué es la ciberseguridad, por qué importa en la vida diaria y cómo piensan los atacantes.",
    difficulty: "PRINCIPIANTE",
    sortOrder: 1,
    lessons: [
      {
        slug: "que-es-ciberseguridad",
        title: "¿Qué es la ciberseguridad?",
        summary: "Definición clara y ejemplos cotidianos en México y Latinoamérica.",
        content: `La **ciberseguridad** es el conjunto de prácticas para proteger sistemas, redes y datos contra accesos no autorizados, robo o daño.

No es solo “cosa de empresas”: cada vez que usas banca en línea, compras en un marketplace o chateas con tu familia, dependes de que tu información esté protegida.

**Triada CIA (Confidencialidad, Integridad, Disponibilidad)**
- *Confidencialidad*: solo quien debe ver la información puede verla (por ejemplo, tu RFC o historial médico).
- *Integridad*: la información no se altera sin permiso (un comprobante de pago falso).
- *Disponibilidad*: los servicios están accesibles cuando los necesitas (caídas por ransomware).

**Ejemplo real:** Recibes un mensaje por WhatsApp que dice “tu paquete está retenido, paga aquí”. Si pagas sin verificar, pierdes dinero y expones datos. La ciberseguridad te enseña a **verificar antes de confiar**.`,
      },
      {
        slug: "amenazas-comunes",
        title: "Amenazas comunes para principiantes",
        summary: "Malware, estafas y errores humanos explicados sin tecnicismos.",
        content: `Las amenazas más frecuentes para usuarios nuevos suelen combinar **tecnología simple** con **engaño social**.

1. **Phishing (suplantación):** correos o mensajes que imitan a tu banco, gobierno o tienda favorita.
2. **Malware:** programas que infectan tu celular o PC (a veces disfrazados de apps “gratis”).
3. **Contraseñas débiles o reutilizadas:** si filtran una, entran a todas tus cuentas.
4. **Wi‑Fi público sin cuidado:** alguien en la misma red puede interceptar tráfico no cifrado.

**Regla de oro:** reduce el riesgo con actualizaciones, copias de seguridad y escepticismo saludable ante urgencias (“¡paga en 10 minutos o bloqueamos tu cuenta!”).`,
      },
    ],
    quizTitle: "Evaluación: Fundamentos",
    questions: [
      {
        text: "¿Qué describe mejor la confidencialidad en la triada CIA?",
        explanation:
          "Confidencialidad significa que la información solo es accesible para personas autorizadas.",
        options: [
          { text: "Que los servicios estén siempre en línea", isCorrect: false },
          { text: "Que solo personas autorizadas accedan a la información", isCorrect: true },
          { text: "Que los datos nunca cambien de formato", isCorrect: false },
          { text: "Que uses antivirus premium", isCorrect: false },
        ],
      },
      {
        text: "Un mensaje urgente pidiendo pagar un “adeudo” con un enlace desconocido es ejemplo de:",
        explanation:
          "Combina presión emocional (urgencia) con suplantación, típico de phishing.",
        options: [
          { text: "Copia de seguridad", isCorrect: false },
          { text: "Phishing", isCorrect: true },
          { text: "Cifrado extremo a extremo", isCorrect: false },
          { text: "Autenticación multifactor", isCorrect: false },
        ],
      },
      {
        text: "¿Cuál es una buena primera línea de defensa personal?",
        explanation:
          "Mantener sistemas actualizados corrige vulnerabilidades conocidas.",
        options: [
          { text: "Desactivar todas las actualizaciones", isCorrect: false },
          { text: "Reutilizar la misma contraseña en todas partes", isCorrect: false },
          { text: "Instalar actualizaciones del sistema y apps", isCorrect: true },
          { text: "Compartir OTP con soporte técnico", isCorrect: false },
        ],
      },
    ],
  },
  {
    slug: "internet-y-redes",
    title: "Internet y redes básicas",
    description:
      "Aprende cómo viaja tu información en Internet, qué es una IP, DNS y por qué importa el HTTPS.",
    difficulty: "PRINCIPIANTE",
    sortOrder: 2,
    lessons: [
      {
        slug: "como-funciona-internet",
        title: "Cómo funciona Internet (sin magia)",
        summary: "Paquetes de datos, routers y el papel de tu proveedor de Internet.",
        content: `Internet es una red de redes. Cuando abres un sitio, tu dispositivo divide la solicitud en **paquetes** que viajan por varios **routers** hasta un servidor.

**Analogía:** como enviar cartas con rastreo: cada paquete lleva dirección de origen y destino.

**IP:** dirección numérica de un dispositivo en la red (como un código postal digital).
**DNS:** “agenda telefónica” que traduce nombres como \`bastion.app\` a direcciones IP.

Si alguien controla tu DNS (por ejemplo en un Wi‑Fi malicioso), puede redirigirte a sitios falsos aunque escribas bien la URL.`,
      },
      {
        slug: "https-y-wifi",
        title: "HTTPS y Wi‑Fi seguro",
        summary: "El candado del navegador y buenas prácticas en redes públicas.",
        content: `**HTTPS** cifra la comunicación entre tu navegador y el sitio. Busca el **candado** y que la URL comience con \`https://\`.

En **Wi‑Fi público** (cafeterías, aeropuertos):
- Evita operaciones sensibles sin VPN si no confías en la red.
- No ignores advertencias de certificado del navegador.
- Prefiere compartir internet desde tu celular si dudas.

**Ejemplo:** Un portal cautivo falso puede pedir credenciales de Facebook “para darte Wi‑Fi”. Es una trampa para robar contraseñas.`,
      },
    ],
    quizTitle: "Evaluación: Internet y redes",
    questions: [
      {
        text: "¿Para qué sirve el DNS?",
        explanation: "DNS resuelve nombres de dominio a direcciones IP.",
        options: [
          { text: "A cifrar el disco duro", isCorrect: false },
          { text: "A traducir nombres de sitio a direcciones IP", isCorrect: true },
          { text: "A acelerar la batería del celular", isCorrect: false },
          { text: "A bloquear anuncios", isCorrect: false },
        ],
      },
      {
        text: "¿Qué indica HTTPS en la barra del navegador?",
        explanation: "HTTPS protege la comunicación con cifrado entre cliente y servidor.",
        options: [
          { text: "Que el sitio es 100% confiable sin verificar nada más", isCorrect: false },
          { text: "Que la conexión va cifrada entre tu navegador y el sitio", isCorrect: true },
          { text: "Que no necesitas contraseña", isCorrect: false },
          { text: "Que el sitio no puede tener phishing", isCorrect: false },
        ],
      },
      {
        text: "En Wi‑Fi público, una señal de alerta es:",
        explanation: "Portales de login falsos imitan redes legítimas para robar credenciales.",
        options: [
          { text: "Pedir credenciales sociales para “activar” la red", isCorrect: true },
          { text: "Pedir que aceptes términos del lugar", isCorrect: false },
          { text: "Mostrar el nombre del café en la red", isCorrect: false },
          { text: "Pedir contraseña escrita en el mostrador", isCorrect: false },
        ],
      },
    ],
  },
  {
    slug: "phishing-ingenieria-social",
    title: "Phishing e ingeniería social",
    description:
      "Detecta correos, SMS y llamadas fraudulentas antes de compartir datos o dinero.",
    difficulty: "PRINCIPIANTE",
    sortOrder: 3,
    lessons: [
      {
        slug: "reconocer-phishing",
        title: "Reconocer intentos de phishing",
        summary: "Señales en correos, SMS y mensajes de apps.",
        content: `**Phishing** imita marcas conocidas para robar credenciales o instalar malware.

**Señales frecuentes:**
- Remitente raro (\`banco-seguro@mail.ru\` en lugar del dominio oficial).
- Enlaces que no coinciden al pasar el cursor (muestra \`https://banco-falso.com\`).
- Errores de redacción y logos pixelados.
- Urgencia extrema o premios imposibles.

**Qué hacer:** no hagas clic; abre la app oficial o escribe la URL manualmente. Reporta el mensaje en la plataforma.`,
      },
      {
        slug: "ingenieria-social",
        title: "Ingeniería social más allá del correo",
        summary: "Llamadas, pretexing y manipulación emocional.",
        content: `La **ingeniería social** explota confianza y prisa.

**Vishing:** llamada supuestamente del banco pidiendo NIP o token.
**Pretexting:** alguien finge ser compañero de trabajo pidiendo transferencia “urgente”.
**Quid pro quo:** “Te doy un USB con películas” a cambio de que lo conectes (malware).

**Defensa:** protocolo de verificación (llamar al número oficial), nunca compartir OTP, y pausa de 5 minutos ante urgencias.`,
      },
    ],
    quizTitle: "Evaluación: Phishing",
    questions: [
      {
        text: "¿Cuál es una señal típica de phishing?",
        explanation: "La urgencia artificial presiona para que no pienses críticamente.",
        options: [
          { text: "Mensaje calmado sin plazos", isCorrect: false },
          { text: "Amenaza de cierre de cuenta en minutos si no actúas", isCorrect: true },
          { text: "Correo desde el dominio oficial verificado", isCorrect: false },
          { text: "Enlace que coincide con el sitio real", isCorrect: false },
        ],
      },
      {
        text: "Recibes SMS con enlace acortado “premio Banorte”. Lo más seguro es:",
        explanation: "Acceder por canal oficial evita enlaces manipulados.",
        options: [
          { text: "Abrir el enlace rápido antes de que expire", isCorrect: false },
          { text: "Instalar la APK adjunta", isCorrect: false },
          { text: "Entrar a la app o sitio escribiendo la URL tú mismo", isCorrect: true },
          { text: "Reenviar el SMS a todos tus contactos", isCorrect: false },
        ],
      },
      {
        text: "¿Qué es vishing?",
        explanation: "Vishing = phishing por voz (llamada telefónica).",
        options: [
          { text: "Phishing por llamada telefónica", isCorrect: true },
          { text: "Virus en archivos PDF", isCorrect: false },
          { text: "Cifrado de disco", isCorrect: false },
          { text: "Copia de seguridad en la nube", isCorrect: false },
        ],
      },
    ],
  },
  {
    slug: "seguridad-contrasenas",
    title: "Seguridad de contraseñas",
    description:
      "Crea contraseñas robustas, usa gestores y entiende por qué el reutilizar es peligroso.",
    difficulty: "PRINCIPIANTE",
    sortOrder: 4,
    lessons: [
      {
        slug: "contrasenas-fuertes",
        title: "Contraseñas fuertes y gestores",
        summary: "Longitud, unicidad y frases de contraseña.",
        content: `Una buena contraseña es **larga**, **única** y **difícil de adivinar**.

**Evita:** fechas de nacimiento, \`123456\`, el nombre de tu mascota en todas las cuentas.

**Usa un gestor** (Bitwarden, 1Password, etc.) para generar y guardar contraseñas distintas. Solo memorizas una contraseña maestra fuerte.

**Frase de contraseña:** \`Limonada-7-Calle-Roja!\` es más fácil de recordar que \`Xk9!mQ2\` y puede ser muy segura si es larga.`,
      },
      {
        slug: "filtraciones-y-hash",
        title: "Filtraciones y por qué importa el hash",
        summary: "Qué pasa cuando filtran una base de datos.",
        content: `Cuando un servicio es hackeado, pueden filtrar **hashes** de contraseñas (versiones procesadas, no texto plano en sitios bien administrados).

Si reutilizas contraseña, atacantes prueban la misma en Gmail, Netflix y banca (**credential stuffing**).

**Activa alertas** de filtración (Have I Been Pwned, avisos del navegador) y **cambia** contraseñas afectadas de inmediato.`,
      },
    ],
    quizTitle: "Evaluación: Contraseñas",
    questions: [
      {
        text: "¿Qué práctica reduce más el riesgo tras una filtración?",
        explanation: "Contraseñas únicas limitan el daño a una sola cuenta.",
        options: [
          { text: "Usar la misma contraseña para recordarla", isCorrect: false },
          { text: "Contraseñas distintas por servicio", isCorrect: true },
          { text: "Anotarla en un post-it en el monitor", isCorrect: false },
          { text: "Cambiar solo el emoji del final", isCorrect: false },
        ],
      },
      {
        text: "Un gestor de contraseñas te ayuda principalmente a:",
        explanation: "Genera y almacena contraseñas únicas de forma cifrada.",
        options: [
          { text: "Evitar usar MFA", isCorrect: false },
          { text: "Guardar y generar contraseñas únicas", isCorrect: true },
          { text: "Compartir contraseñas por WhatsApp", isCorrect: false },
          { text: "Desactivar el bloqueo de pantalla", isCorrect: false },
        ],
      },
      {
        text: "Credential stuffing es:",
        explanation: "Reutilizan credenciales filtradas en otros sitios.",
        options: [
          { text: "Probar credenciales robadas en muchos servicios", isCorrect: true },
          { text: "Comprar antivirus", isCorrect: false },
          { text: "Cifrar tu Wi‑Fi", isCorrect: false },
          { text: "Hacer backup en USB", isCorrect: false },
        ],
      },
    ],
  },
  {
    slug: "autenticacion-multifactor",
    title: "Autenticación multifactor (MFA)",
    description:
      "Comprende OTP, apps autenticadoras y por qué MFA protege aunque filtren tu contraseña.",
    difficulty: "PRINCIPIANTE",
    sortOrder: 5,
    lessons: [
      {
        slug: "que-es-mfa",
        title: "¿Qué es MFA?",
        summary: "Algo que sabes, tienes y eres.",
        content: `**MFA** exige dos o más factores para iniciar sesión:
1. Algo que **sabes** (contraseña).
2. Algo que **tienes** (código en app, llave de seguridad).
3. Algo que **eres** (huella, rostro).

Aunque roben tu contraseña, sin el segundo factor no entran fácilmente.

**Prioriza** MFA en correo, banca, Apple/Google/Microsoft ID — son “llaves maestras” de otras cuentas.`,
      },
      {
        slug: "otp-y-estafas",
        title: "OTP y estafas de códigos",
        summary: "Nunca compartas códigos; detecta suplantación de soporte.",
        content: `Los **OTP** (códigos de un solo uso) caducan en segundos. Nadie legítimo te pedirá leerlos por teléfono, excepto si **tú** iniciaste el soporte y verificas el canal.

**Estafa común:** “Soy soporte de WhatsApp, te envío un código para verificar”. En realidad intentan registrar tu número en otro dispositivo.

Si recibes OTP sin pedirlo, **no lo compartas** y revisa sesiones activas de la cuenta.`,
      },
    ],
    quizTitle: "Evaluación: MFA",
    questions: [
      {
        text: "Un segundo factor típico es:",
        explanation: "Las apps autenticadoras generan códigos temporales.",
        options: [
          { text: "Otra contraseña igual a la primera", isCorrect: false },
          { text: "Código de app autenticadora", isCorrect: true },
          { text: "Tu fecha de nacimiento", isCorrect: false },
          { text: "El nombre de tu mascota", isCorrect: false },
        ],
      },
      {
        text: "Si alguien te pide el OTP que acaba de llegar sin que lo hayas solicitado:",
        explanation: "Compartir OTP permite tomar control de la cuenta.",
        options: [
          { text: "Se lo das para ayudar", isCorrect: false },
          { text: "No lo compartes y revisas actividad de la cuenta", isCorrect: true },
          { text: "Lo publicas en redes para ver si es real", isCorrect: false },
          { text: "Lo reenvías a tu familiar", isCorrect: false },
        ],
      },
      {
        text: "MFA protege principalmente cuando:",
        explanation: "El segundo factor bloquea accesos aun con contraseña filtrada.",
        options: [
          { text: "Ya filtraron tu contraseña pero no el segundo factor", isCorrect: true },
          { text: "No usas contraseña", isCorrect: false },
          { text: "Desactivas actualizaciones", isCorrect: false },
          { text: "Usas Wi‑Fi abierto", isCorrect: false },
        ],
      },
    ],
  },
  {
    slug: "malware-vulnerabilidades",
    title: "Malware y vulnerabilidades",
    description:
      "Identifica tipos de malware, parches de seguridad y hábitos para reducir infecciones.",
    difficulty: "INTERMEDIO",
    sortOrder: 6,
    lessons: [
      {
        slug: "tipos-de-malware",
        title: "Tipos comunes de malware",
        summary: "Virus, ransomware, spyware y troyanos en lenguaje claro.",
        content: `**Malware** es software malicioso.

- **Ransomware:** cifra tus archivos y pide rescate (ej. ataques a PyMEs).
- **Spyware:** espía cámara, micrófono o teclas.
- **Troyano:** se disfraza de app útil (reproductor, “hack de juego”).
- **Minero:** usa tu CPU para criptomonedas.

**Prevención:** descarga solo de tiendas oficiales, revisa permisos de apps, mantén copias de seguridad desconectadas.`,
      },
      {
        slug: "vulnerabilidades-y-parches",
        title: "Vulnerabilidades y parches",
        summary: "Por qué “actualizar” es ciberseguridad básica.",
        content: `Una **vulnerabilidad** es un defecto que permite abusar del sistema. Los fabricantes publican **parches** para corregirla.

Retrasar actualizaciones deja ventanas abiertas (como WannaCry en sistemas sin parche).

**Buenas prácticas:** activa actualizaciones automáticas, reinicia cuando lo pida el sistema, y retira apps que ya no uses.`,
      },
    ],
    quizTitle: "Evaluación: Malware",
    questions: [
      {
        text: "El ransomware típicamente:",
        explanation: "Cifra datos y exige pago, aunque pagar no garantiza recuperación.",
        options: [
          { text: "Cifra archivos y pide rescate", isCorrect: true },
          { text: "Mejora la velocidad del PC", isCorrect: false },
          { text: "Es un tipo de firewall", isCorrect: false },
          { text: "Solo afecta servidores, nunca celulares", isCorrect: false },
        ],
      },
      {
        text: "Instalar apps de tienda no oficial aumenta riesgo porque:",
        explanation: "Fuera de tiendas oficiales hay menos revisión y más troyanos.",
        options: [
          { text: "Las tiendas oficiales revisan apps con más rigor", isCorrect: true },
          { text: "El malware no existe en Android", isCorrect: false },
          { text: "Los parches no sirven en móviles", isCorrect: false },
          { text: "HTTPS lo bloquea todo", isCorrect: false },
        ],
      },
      {
        text: "Un parche de seguridad sirve para:",
        explanation: "Corrige fallas conocidas explotables por atacantes.",
        options: [
          { text: "Corregir vulnerabilidades conocidas", isCorrect: true },
          { text: "Eliminar la necesidad de contraseñas", isCorrect: false },
          { text: "Hacer phishing legal", isCorrect: false },
          { text: "Aumentar anuncios", isCorrect: false },
        ],
      },
    ],
  },
  {
    slug: "identidad-y-privacidad",
    title: "Identidad digital y privacidad",
    description:
      "Protege tu huella digital, configura privacidad en redes y entiende permisos de apps.",
    difficulty: "PRINCIPIANTE",
    sortOrder: 7,
    lessons: [
      {
        slug: "huella-digital",
        title: "Huella digital y metadatos",
        summary: "Lo que publicas permanece y se compone un perfil.",
        content: `Tu **huella digital** es el rastro de datos que dejas: fotos, comentarios, ubicaciones, likes.

**Metadatos** en fotos pueden incluir GPS del lugar donde tomaste la imagen.

Antes de publicar: ¿expone a menores? ¿muestra documentos? ¿revela rutina diaria?

**Ejercicio:** busca tu nombre en un buscador y revisa qué encuentra un desconocido.`,
      },
      {
        slug: "privacidad-en-apps",
        title: "Privacidad en apps y redes",
        summary: "Permisos, configuración y minimización de datos.",
        content: `Revisa **permisos** de cámara, micrófono y contactos; niega lo que no tenga sentido.

En redes sociales usa perfiles privados cuando sea posible y desactiva geolocalización en publicaciones.

**Principio de minimización:** comparte solo lo necesario en formularios y registros.`,
      },
    ],
    quizTitle: "Evaluación: Privacidad",
    questions: [
      {
        text: "Los metadatos de una foto pueden revelar:",
        explanation: "EXIF/GPS puede mostrar dónde se tomó la imagen.",
        options: [
          { text: "Ubicación donde se tomó la foto", isCorrect: true },
          { text: "Tu contraseña de banca", isCorrect: false },
          { text: "El modelo exacto del servidor del banco", isCorrect: false },
          { text: "Solo el color de tu ropa", isCorrect: false },
        ],
      },
      {
        text: "Principio de minimización significa:",
        explanation: "Entregar la menor cantidad de datos personales necesaria.",
        options: [
          { text: "Compartir todos los datos que pidan", isCorrect: false },
          { text: "Dar solo la información estrictamente necesaria", isCorrect: true },
          { text: "No usar contraseñas", isCorrect: false },
          { text: "Publicar tu CURP en redes", isCorrect: false },
        ],
      },
      {
        text: "Un permiso sospechoso en una linterna app es:",
        explanation: "Una app de linterna no necesita acceder a contactos.",
        options: [
          { text: "Acceso a contactos", isCorrect: true },
          { text: "Encender el flash", isCorrect: false },
          { text: "Mostrar anuncios", isCorrect: false },
          { text: "Ajustar brillo", isCorrect: false },
        ],
      },
    ],
  },
];

export const achievementSeeds = [
  { slug: "primera-leccion", title: "Primer paso", description: "Completaste tu primera lección en Bastion.", xpBonus: 25, icon: "footprints" },
  { slug: "primer-quiz", title: "Evaluado", description: "Aprobaste tu primer cuestionario.", xpBonus: 40, icon: "check-circle" },
  { slug: "curso-completado", title: "Módulo dominado", description: "Terminaste un curso completo con su evaluación.", xpBonus: 75, icon: "trophy" },
  { slug: "nivel-cinco", title: "Guardián en formación", description: "Alcanzaste el nivel 5.", xpBonus: 100, icon: "star" },
  { slug: "explorador", title: "Explorador", description: "Te inscribiste en tres cursos diferentes.", xpBonus: 60, icon: "compass" },
] as const;
