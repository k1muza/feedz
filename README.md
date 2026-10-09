# FeedSport International - AI-Powered Animal Nutrition Platform

Welcome to the official repository for the FeedSport International web application. This is a comprehensive Next.js application built to showcase feed ingredients, provide AI-driven feed formulation recommendations, and manage all aspects of the business through a feature-rich admin panel.

## ✨ Key Features

### Public-Facing Website
- **Modern Home Page**: A sleek, captivating landing page for feed ingredients.
- **Product Catalog**: Browse, filter, and view detailed specifications for all feed products and ingredients.
- **Dynamic Category Pages**: Explore products organized by nutritional categories.
- **Blog**: An integrated blog with articles on nutrition, industry news, and research, optimized for SEO.
- **About & Contact Pages**: Professional pages to introduce the company and provide contact information.
- **SEO Optimized**: Includes dynamic metadata, structured data (JSON-LD), and a sitemap for enhanced search engine visibility.
- **Real-time Chat**: AI-powered chatbot for product inquiries, sales questions, and routing to live agents.

### Admin Panel (`/admin`)
- **Dashboard**: An overview of key business metrics, including inventory, sales, and data visualizations.
- **Product & Ingredient Management**: Full CRUD functionality for ingredients and saleable products.
- **Blog Management**: A full-featured CMS for creating and editing blog posts.
- **Asset Library**: An S3-backed image management system to select images for products and posts.
- **Stock, Sales & Invoicing**: Dedicated pages for managing inventory levels and customer invoices.
- **Real-time Conversation Management**: View and respond to user chats in real-time, with the ability to suspend the AI and take over conversations.
- **Settings**: A centralized place to manage application settings and user roles.

### GenAI & AI Features
- **AI Recommendation Engine**: Utilizes Genkit to provide AI-powered feed ingredient combination recommendations based on user goals.
- **Conversational AI Router**: A multi-flow system that intelligently routes user chat inquiries to specialized AI agents for product questions, sales, and formulation advice.
- **AI-Generated Product Details**: An AI tool to automatically generate compelling marketing copy and technical details for new ingredients.
- **AI-Assisted Invoicing**: An AI agent that can create customer invoices based on a conversational request.

---

## 🚀 Tech Stack

This project is built with a modern, robust, and scalable technology stack:

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **UI Library**: [React 18](https://react.dev/)
- **AI/ML**: [Google's Genkit](https://genkit.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🏁 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or newer recommended)
- npm or yarn

### Installation & Running

1. **Clone the repository:**
   ```sh
   git clone <your-repository-url>
   cd <repository-folder>
   ```

2. **Install NPM packages:**
   ```sh
   npm install
   ```

3. **Run the development server:**
   The application requires two separate development servers to run concurrently: one for the Next.js frontend and one for the Genkit AI flows.

   - **Terminal 1: Start the Next.js app**
     ```sh
     npm run dev
     ```
     Your application will be available at `http://localhost:9002`.

   - **Terminal 2: Start the Genkit server**
     ```sh
     npm run genkit:dev
     ```
     This starts the Genkit flows and makes them available for the Next.js app to call.

---

## 📂 Folder Structure

Here is a high-level overview of the project's structure:

```
.
├── src
│   ├── app/                # All routes and pages
│   │   ├── (admin)/        # Routes for the admin panel
│   │   ├── (main)/         # Routes for the public website
│   │   ├── (blog)/         # Routes for the blog section
│   │   ├── api/            # API routes
│   │   ├── layout.tsx      # Root layout
│   │   └── actions.ts      # Server actions
│   ├── ai/                 # Genkit AI flows and configuration
│   ├── components/         # Reusable React components
│   ├── data/               # Static data sources (nutrients, etc.)
│   ├── lib/                # Utility functions
│   ├── types/              # TypeScript type definitions
│   └── hooks/              # Custom React hooks
├── public/                 # Static assets (images, fonts)
└── tailwind.config.ts      # Tailwind CSS configuration
```


---

## 🤖 MCP Server

FeedSport exposes its formulation engine to MCP-compatible AI agents (Claude, ChatGPT, etc.) at `/api/mcp` (Streamable HTTP, stateless, read-only). See [docs/mcp-spec.md](docs/mcp-spec.md) for the product spec.

Tools: `get_programmes`, `get_programme`, `search_ingredients`, `get_ingredient`, `formulate`, `analyse_formulation`, plus diagnostics — `explain_formulation`, `diagnose_infeasibility`, `run_sensitivity_analysis`, `find_ingredient_opportunities`, `compare_formulation_strategies` (engine side in `src/lib/feed-formulation-diagnostics.ts`). The server is a thin layer in `src/lib/mcp/` over the same optimizer, programme, ingredient and pricing modules the web app uses.

Connect a client, e.g. Claude Code:

```bash
claude mcp add --transport http feedsport http://localhost:9002/api/mcp
# production: https://www.feedsport.co.zw/api/mcp
```

`/api/mcp` needs no credentials, is read-only and never writes data.

### Advisor endpoint (saved formulations, OAuth)

FeedSport's advising nutritionist connects to **`/api/mcp/advisor`**, which adds every user's saved Studio formulations and advice: `list_users`, `list_saved_formulations`, `get_saved_formulation` and `add_formulation_advice` (logic in `src/lib/mcp/feedsport-formulations.ts`). Advice, optionally with a suggested revision that FeedSport formulates before saving, appears under the formulation's History tab in the Studio.

Every request needs a bearer token. Supabase Auth is the OAuth 2.1 authorization server: clients find it through `/.well-known/oauth-protected-resource/api/mcp/advisor`, send the nutritionist to `/oauth/consent` to approve, and receive a Supabase access token. The account must be in `advisor_users` (admins count as advisors); anyone else gets `403`. The static `FEEDSPORT_MCP_ADVISOR_TOKEN` is accepted too, for scripts and clients without OAuth.

Setup:

1. Apply `supabase/migrations/20261009000000_formulation_advice.sql` and `20261009010000_advisor_users.sql`, then add the nutritionist (after they've signed up in the Studio):
   ```sql
   insert into public.advisor_users (user_id, email)
   select id, email from auth.users where email = 'nutritionist@example.com';
   ```
2. In Supabase → **Authentication → OAuth Server**: enable it, set the authorization path to `/oauth/consent`, and allow dynamic client registration (Claude registers itself). Check **Authentication → URL Configuration → Site URL** is `https://www.feedsport.co.zw` — the consent link is Site URL + path.
3. Set `SUPABASE_SECRET_KEY` (Supabase → Project Settings → API Keys; bypasses row-level security, so server-side only) locally and in Vercel. Optionally set `FEEDSPORT_MCP_ADVISOR_TOKEN` (at least 32 characters, `openssl rand -hex 32`).

Connect:

- **claude.ai / Claude Desktop:** Settings → Connectors → Add custom connector → `https://www.feedsport.co.zw/api/mcp/advisor`, then Connect and sign in with the advisor account.
- **Claude Code:** `claude mcp add --transport http feedsport-advisor https://www.feedsport.co.zw/api/mcp/advisor`, then run `/mcp` and choose Authenticate. With the static token instead: add `--header "Authorization: Bearer $FEEDSPORT_MCP_ADVISOR_TOKEN"`.

Revoke a person's access by deleting their `advisor_users` row (takes effect on their next request); OAuth grants can also be revoked in Supabase. Rotate the static token by changing the env var.
