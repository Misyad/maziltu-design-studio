# Maziltu Design Studio

# MZT APPS Frontend Redesign

Build a complete production-ready frontend for **MZT APPS (Maziltu Tholiban)**.

## IMPORTANT

DO NOT modify, rename, or recreate the backend API.

The backend is already finished in Laravel.

The frontend MUST consume the existing REST API exactly as documented.

Do NOT change:

- API Routes

- HTTP Methods

- Request Body

- Response Shape

- Authentication Flow

- Authorization

- Database Structure

Treat the backend as immutable.

---

# Design Inspiration

The visual direction should follow the attached UI reference.

Not the content.

Not the branding.

Only the design language.

Adopt:

- Modern premium layout

- Large photography

- Strong typography

- Rounded cards

- Plenty of whitespace

- Smooth gradients

- Elegant shadows

- Enterprise-quality UI

- Premium animations

- Beautiful responsive layouts

Avoid making it look like a generic admin template.

---

# Brand Identity

Organization:

Maziltu Tholiban

Theme:

Modern Islamic Organization

Keywords:

Professional

Premium

Elegant

Clean

Friendly

Trustworthy

Modern

Minimal

Primary Color

#166534

Secondary

#15803D

Accent

#B8860B

Background

#F6F8F7

Dark Background

#0D1317

Text

#17202A

Use emerald as the dominant color.

Gold only as an accent.

---

# Typography

Headings

Plus Jakarta Sans

Body

Inter

Large headings.

Comfortable spacing.

Readable typography.

---

# Frontend Stack

Next.js 15

App Router

TypeScript

TailwindCSS

shadcn/ui

TanStack Query

React Hook Form

Zod

Axios

Lucide Icons

Framer Motion

next-themes

Use modern React patterns.

---

# Responsive

Desktop

Tablet

Mobile

All pages must be responsive.

No horizontal overflow.

---

# Public Website

Create a premium landing page.

Sections:

Hero

About

Statistics

Programs

Events

News

Gallery

Testimonials

CTA

Footer

Hero should include

Large background image

Gradient overlay

Headline

Subheadline

Buttons

Statistics

Navigation

---

Programs section

Display cards for:

Members

Events

Attendance

News

Digital ID Card

Online Payment

Dashboard

Each card should have

Icon

Image

Title

Description

Hover animation

---

Statistics

Animated counters

Members

Events

Branches

Committees

---

Events

Upcoming events

Beautiful cards

Status badge

Date

Location

CTA

---

News

Modern card grid

Featured article

Recent articles

---

Gallery

Responsive masonry gallery

Lightbox

---

Contact

Modern contact section

Google Maps placeholder

Organization information

---

Footer

Multi-column

Social links

Quick links

Copyright

---

# Admin Dashboard

Use a completely different layout.

Enterprise dashboard.

Inspired by:

Linear

Notion

Stripe Dashboard

Vercel

Supabase

NOT by Bootstrap Admin templates.

---

Dashboard

Sidebar

Topbar

Breadcrumb

Global Search

Theme Toggle

Notifications

Profile Menu

Stat Cards

Charts

Calendar

Recent Events

Recent Activities

Quick Actions

---

Members

Large DataTable

Search

Pagination

Sorting

Filters

Bulk Actions

Create

Edit

Delete

Print ID Card

Responsive table

---

Events

Beautiful event management

Banner preview

Date range picker

Status badges

CRUD

---

Attendance

Scanner input

Live validation

Attendance table

Success animation

---

News

Rich editor

Slug generator

Image upload

Preview

---

Transactions

Modern finance table

Status badges

Filters

---

Activity Log

Timeline

Table

Search

Filters

---

Profile

Editable profile

Avatar upload

Password update

---

ID Card

Visual editor

Print preview

Export

---

# Components

Create reusable components.

Button

Card

Badge

Modal

Drawer

Dialog

Toast

Dropdown

Avatar

DataTable

EmptyState

Skeleton

Loading

FormField

StatCard

SectionTitle

HeroBanner

Gallery

Timeline

Pagination

SearchBox

DateRangePicker

ThemeToggle

Sidebar

Topbar

Breadcrumb

Everything should be reusable.

---

# Animations

Use Framer Motion.

Fade

Slide

Scale

Stagger

Page transitions

Counter animation

Hover animation

Avoid excessive animation.

Professional only.

---

# Dark Mode

Support Light

Dark

System

Persist theme.

---

# Accessibility

WCAG AA

Keyboard navigation

Focus state

Semantic HTML

ARIA

---

# Performance

Lazy loading

Code splitting

Image optimization

Suspense

Streaming where appropriate

No unnecessary re-renders.

---

# API

DO NOT CHANGE ANY API.

Consume every endpoint exactly as defined in the specification document.

Authentication must remain:

Login

GET /user

Bearer Token

Logout

Everything else must follow the backend specification.

Never invent new endpoints.

Never rename fields.

Never change request bodies.

Never simulate data if API exists.

---

# Folder Structure

Create a scalable architecture.

app/

components/

features/

hooks/

services/

providers/

lib/

types/

schemas/

styles/

constants/

assets/

Use feature-based organization where appropriate.

---

# Code Quality

Strict TypeScript

Reusable hooks

Reusable services

Clean architecture

No duplicated code

No inline styles

Use Tailwind utility classes

Production-ready quality

---

# Final Goal

Build a frontend that feels like a premium SaaS product while preserving 100% compatibility with the existing Laravel backend API.

The finished result should look like a modern enterprise application with a premium public website inspired by the provided design reference, while the admin dashboard should prioritize usability, scalability, and maintainability.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cf313877-1481-4bbe-983e-66cc50deb89e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
