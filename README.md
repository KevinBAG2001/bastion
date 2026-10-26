# Bastion

Plataforma educativa en español para aprender **ciberseguridad desde cero**: lecciones guiadas, cuestionarios con retroalimentación, progreso persistente, XP, niveles y logros.

Documentación técnica: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## Requisitos

- **Node.js 24 LTS (24.22.1)** — ver `.nvmrc` / `.node-version`
- **pnpm 12.15.0** (`corepack enable && corepack prepare pnpm@12.15.0 --activate`)
- **Docker Desktop** (PostgreSQL local) — funciona en Windows, macOS y Linux
- Git

## Configuración en Windows (paso a paso)

1. Clona el repositorio y abre la carpeta en tu terminal (PowerShell o Git Bash).

   ```powershell
   git clone https://github.com/KevinBAG2001/bastion.git
   cd bastion
   git checkout dev
   ```

2. Instala dependencias:

   ```powershell
   corepack enable
   pnpm install
   ```

3. Copia variables de entorno:

   ```powershell
   copy .env.example .env
   ```

   Edita `.env` y genera un `AUTH_SECRET` seguro (PowerShell):

   ```powershell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   ```

4. Inicia PostgreSQL:

   ```powershell
   docker compose up -d
   ```

5. Aplica migraciones y carga el contenido educativo:

   ```powershell
   pnpm db:migrate:dev
   pnpm db:seed
   ```

   En CI o despliegue usa `pnpm db:migrate` (sin modo interactivo).

6. Arranca la aplicación:

   ```powershell
   pnpm dev
   ```

   Abre [http://localhost:3000](http://localhost:3000).

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Build y servidor de producción |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Comprobación TypeScript |
| `pnpm test` | Pruebas unitarias (Vitest) |
| `pnpm test:e2e` | Flujo e2e con Playwright |
| `pnpm db:seed` | Vuelve a cargar cursos y logros |

## Flujo de ramas

`feature/*` → `dev` → `qa` → `main`

## Licencia

Copyright 2026 Kevin Austria Galvan.

Este proyecto se distribuye bajo la [Licencia Apache 2.0](LICENSE). Consulta también el archivo [NOTICE](NOTICE).

El software se ofrece **tal cual**, sin garantías de ningún tipo, ya sean expresas o implícitas, incluidas, entre otras, las garantías de comerciabilidad, idoneidad para un fin particular y no infracción. El uso del software es bajo tu propio riesgo.
