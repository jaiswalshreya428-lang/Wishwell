# 11. Third-Party Software Licenses & AI Tool Credits

## 11.1 Open-Source Software Dependencies & Licenses

All third-party libraries used in WishWell are permissive open-source packages (MIT, BSD-3-Clause, Apache-2.0, HPND) suitable for educational and commercial applications.

### 11.1.1 Backend Dependencies (Python)

| Package Name | Version | License | Purpose in WishWell |
|---|---|---|---|
| **FastAPI** | `^0.115.0` | MIT | High-performance asynchronous web framework, routing, and dependency injection. |
| **Uvicorn** | `^0.32.0` | BSD-3-Clause | Lightning-fast ASGI production web server. |
| **Pydantic** | `^2.9.0` | MIT | Strict data validation, schema enforcement, and serialization. |
| **Pydantic-Settings** | `^2.5.0` | MIT | Environment variable parsing and type coercion. |
| **SQLAlchemy** | `^2.0.35` | MIT | Async Object-Relational Mapper (ORM), SQL expression language, and connection pooling. |
| **Alembic** | `^1.13.0` | MIT | Database schema migrations and version management. |
| **PyODBC** | `^5.1.0` | MIT | Synchronous ODBC database driver for Microsoft SQL Server / Azure SQL. |
| **AioODBC** | `^0.5.0` | Apache-2.0 | Asynchronous ODBC driver wrapper for non-blocking SQLAlchemy database operations. |
| **PyJWT** | `^2.8.0` | MIT | Cryptographic JSON Web Token (JWT) encoding and verification (HS256). |
| **Cryptography** | `^43.0.0` | Apache-2.0 / BSD-3-Clause | Low-level cryptographic primitives supporting JWT, TLS, and hash functions. |
| **Bcrypt** | `^4.1.2` | Apache-2.0 | Secure password hashing using salted bcrypt algorithms (work factor 12). |
| **Python-Dotenv** | `^1.0.1` | BSD-3-Clause | Loads environment configuration variables from `.env` files for local development. |
| **Azure-Storage-Blob** | `^12.23.0` | MIT | Official Azure SDK client for Blob storage, private containers, and SAS URL generation. |
| **Azure-Cosmos** | `^4.7.0` | MIT | Official Azure SDK client for Azure Cosmos DB (Core/SQL API) serverless NoSQL documents. |
| **Python-Multipart** | `^0.0.9` | Apache-2.0 | Streaming parser for multipart/form-data file and document uploads. |
| **HTTPX** | `^0.27.0` | BSD-3-Clause | Modern asynchronous HTTP client used for automated API testing. |
| **APScheduler** | `^3.10.4` | MIT | Advanced Python Scheduler running periodic background stale-claim release jobs. |
| **Pillow (PIL)** | `^10.4.0` | HPND (Historical Permission Notice and Disclaimer) | Secure image processing, format conversion, and EXIF/GPS metadata stripping. |
| **Email-Validator** | `^2.2.0` | MIT | Robust email syntax validation for user registration. |
| **Pytest** | `^8.3.0` | MIT | Unit, integration, and concurrency test execution framework. |
| **Pytest-Asyncio** | `^0.24.0` | Apache-2.0 | Asyncio event loop integration for testing asynchronous FastAPI endpoints. |
| **Aiosqlite** | `^0.20.0` | MIT | Fast in-memory asynchronous SQLite engine for rapid automated testing. |

---

### 11.1.2 Frontend Dependencies (React & TypeScript)

| Package Name | Version | License | Purpose in WishWell |
|---|---|---|---|
| **React** | `^18.3.1` | MIT | Declarative component-based UI library for single-page applications. |
| **React-DOM** | `^18.3.1` | MIT | DOM rendering layer for React components. |
| **React-Router-DOM** | `^6.26.2` | MIT | Client-side routing and role-protected navigation. |
| **Lucide-React** | `^0.447.0` | MIT | Clean, modern SVG icon set for accessible, consistent UI controls. |
| **Recharts** | `^2.12.7` | MIT | Composable charting library for rendering admin analytics and monthly trends. |
| **Tailwind CSS** | `^3.4.13` | MIT | Utility-first CSS framework for responsive layout and styling. |
| **PostCSS** | `^8.4.47` | MIT | Tool for transforming styles with JS plugins. |
| **Autoprefixer** | `^10.4.20` | MIT | Adds vendor prefixes to CSS rules automatically. |
| **Vite** | `^5.4.11` | MIT | Next-generation frontend build tool and hot module replacement dev server. |
| **TypeScript** | `^5.5.3` | Apache-2.0 | Strongly typed programming language superset for JavaScript. |

---

## 11.2 Development Toolchain & Acknowledgments

The WishWell engineering and testing workflow utilized standard enterprise developer toolchains:
1. **Integrated Development Environment**: Visual Studio Code with Python (Pyright/Pylance) and TypeScript language servers.
2. **Version Control & Collaboration**: Git version control with atomic commit standards and GitHub CI/CD automation.
3. **Containerization & Cloud Infrastructure**: Docker container runtime, Microsoft SQL Server 2022 Developer edition, and Microsoft Azure Cloud Platform.
4. **Testing & Quality Assurance**: Pytest async test framework, HTTPX client, and automated security scanners.

