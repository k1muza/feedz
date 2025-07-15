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
- **AI/ML**: [Google's Genkit](https://firebase.google.com/docs/genkit)
- **Database**: [Firestore](https://firebase.google.com/docs/firestore) & [Firebase Realtime Database](https://firebase.google.com/docs/database) for chat.
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
│   ├── lib/                # Utility functions (Firebase, etc.)
│   ├── types/              # TypeScript type definitions
│   └── hooks/              # Custom React hooks
├── public/                 # Static assets (images, fonts)
└── tailwind.config.ts      # Tailwind CSS configuration
```

---

This project was bootstrapped with Firebase Studio.
