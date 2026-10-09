# Google Ads — Factura Fácil

Budget: **$10/day (~$300/mo)**. Geo: **entire US**. Starting from a new account.
Written 2026-10-09.

---

## 1. The honest math before you start

At $10/day nationally you are buying information, not growth. Run the numbers:

| | |
|---|---|
| Spanish invoicing keywords in the US | low competition, roughly **$0.60–$2.00 CPC** |
| $10/day at ~$1.20 CPC | **~8 clicks/day, ~250/month** |
| Cold search traffic → free signup | 3–8% realistic → **8–20 signups/month** |
| Free → Pro | unknown yet; 5–15% → **1–3 paid/month ($20–60 MRR)** |

So month one and month two lose money. That is normal and not a reason to panic.

**The number that decides whether to continue is cost per free signup, not profit.**
Under ~$15 → keep going and work on conversion. Over ~$50 → turn it off, the
channel is not for you.

The one thing working in your favor: almost nobody bids on Spanish-language
invoicing keywords in the US. English terms like "invoice software" run $10–20
a click and you cannot compete there. Spanish is cheap because it is empty.
**That gap is the entire reason this is worth testing.** Everything below is
built to stay inside it.

---

## 2. Before you spend a dollar: conversion tracking

Without it you are buying clicks blind — you will see spend and no idea which
keyword produced a signup. Do not skip this.

What is needed: a Google Ads conversion action for "free signup", fired on the
page the user lands on right after creating an account.

Ask Claude to wire this up — it is a code change in the app (a gtag snippet
plus a fire on signup success). Get the conversion ID and label from
**Tools → Conversions → New conversion action → Website** first.

---

## 3. Account setup — the trap

Google's onboarding wizard pushes everyone into a **Smart campaign**. Smart
campaigns hide keywords, hide search terms, and spend on broad match. At $10/day
that is a guaranteed waste.

1. Create the account at ads.google.com.
2. When the wizard asks for your goal, look for **"Switch to Expert Mode"** —
   it is a small link at the bottom. Click it.
3. If it forces you through, create the Smart campaign, then **pause and delete
   it** and build a Search campaign manually.
4. Set billing. Enter the promo code if Google offers spend matching.
5. **Settings → Account settings → turn OFF "Auto-apply recommendations".**
   Every one of them. Google will otherwise silently add broad match keywords
   and raise your budget.

---

## 4. Campaign settings (exact)

Create: **New campaign → Leads → Search**.

| Setting | Value | Why |
|---|---|---|
| Campaign type | Search only | Never Performance Max at this budget |
| **Search Partners** | **OFF** | Low-quality traffic, no control |
| **Display Network** | **OFF** | Google checks this by default. It will eat your budget |
| Locations | United States | Set to **"Presence: people in"**, not "interest" |
| Languages | **Spanish AND English** | Many US Latinos have English-language phones but search in Spanish. The keyword does the filtering |
| Budget | $10/day | |
| Bidding | **Maximize clicks** with a **max CPC cap of $1.50** | Do not use Target CPA until you have 30+ conversions |
| Ad rotation | Optimize | |
| Ad schedule | All day to start | Narrow later based on data |
| Devices | All, but expect 80%+ mobile | Your customer is in a truck |

---

## 5. Ad groups and keywords

Two ad groups. Keep them tight. **Phrase match only** — no broad match.

### Ad group 1: "Hacer facturas"

```
"app para hacer facturas"
"aplicacion para hacer facturas"
"programa para hacer facturas"
"hacer facturas en español"
"como hacer una factura"
"hacer una factura gratis"
"app de facturas gratis"
"crear factura gratis"
"app para facturar"
"hacer recibos de pago"
```

### Ad group 2: "Presupuestos y oficios"

```
"app para hacer presupuestos"
"como hacer un presupuesto de trabajo"
"facturas para contratistas"
"factura para jardineria"
"app de facturas para negocio"
"facturas para servicio de limpieza"
"presupuesto para construccion"
```

Add exact match `[app para hacer facturas]` and `[hacer factura gratis]` as
well — they are your best terms and exact match protects them.

---

## 6. Negative keywords — this is where you save the money

Add these at the **campaign** level immediately. "Factura" is a dangerous word:
in Mexico and most of Latin America it also means **"my utility bill"**, and
across the region it means **government e-invoicing**. Both are pure waste for you.

**People paying a bill (biggest waste source):**
```
-pagar          -mi factura     -consultar      -recibo de luz
-cfe            -telmex         -izzi           -totalplay
-luz            -agua           -telefono       -internet
-estado de cuenta
```

**Government e-invoicing — not what you do:**
```
-sat            -cfdi           -timbrado       -timbrar
-sunat          -dian           -afip           -dgi
-sii            -rfc            -factura electronica
-facturacion electronica        -verifactu      -aeat
-españa         -portugal
```

**Templates and freebies that never convert:**
```
-plantilla      -formato        -excel          -word
-ejemplo        -machote        -imprimir       -llenar a mano
```

**Jobs and learning:**
```
-curso          -empleo         -trabajo        -como ser
-que es         -significado    -contador       -carrera
```

**Competitors (too expensive at this budget):**
```
-quickbooks     -wave           -zoho           -square
-freshbooks     -odoo           -contpaqi       -aspel
```

⚠️ Check **Campaigns → Insights → Search terms** twice a week for the first
month and add new negatives. This is the single highest-value thing you will do.

---

## 7. The ad (Responsive Search Ad)

**Final URL:** `https://facturafacilapp.com/?utm_source=google&utm_medium=cpc&utm_campaign=es_facturas`
**Display path:** `/facturas` `/gratis`

### Headlines (max 30 characters — all verified)

```
Haz tu factura en español
Facturas por WhatsApp
Tu factura en 1 minuto
Gratis y sin tarjeta
La IA hace tu factura
Para jardineros y más
Presupuestos y facturas
Sin comisiones por cobrar
Cobra por Zelle o Cash App
Hecho para tu oficio
3 facturas gratis al mes
App de facturas en español
Escríbelo, sale la factura
Facturas en tu celular
Para limpieza y mecánicos
```

Pin **"Haz tu factura en español"** to Headline position 1. That word is your
entire differentiator and you want it visible every time.

### Descriptions (max 90 characters — all verified)

```
Cuéntale el trabajo a la IA y ella hace la factura. Mándala por WhatsApp en segundos.
Gratis: 3 facturas y 3 presupuestos al mes. Sin tarjeta y sin vencimiento. En español.
Tu logo y tus precios en cada factura. Cobra por Zelle, Cash App, efectivo o cheque.
Para jardineros, limpieza, mecánicos y construcción. Empieza gratis hoy mismo.
Sin comisiones. Tu cliente abre un enlace con el PDF y te paga como siempre.
```

### Sitelinks (free extra space, always add them)

| Text | URL |
|---|---|
| Empezar gratis | `/signup` |
| Ver precios | `/#precios` |
| Preguntas frecuentes | `/#preguntas` |
| Cómo funciona | `/` |

### Callouts

```
Sin tarjeta de crédito · En español · Sin comisiones · Listo en 1 minuto · Jardinería y limpieza
```

---

## 8. After two weeks

Check these, in this order:

1. **Search terms report.** Are the actual queries relevant? Add negatives.
2. **Cost per free signup.** Under $15 is promising. Over $50, stop.
3. **Which ad group wins.** Shift budget to it. Do not keep a loser alive.
4. **Mobile vs desktop.** If mobile converts worse, your signup flow has a
   phone problem — fix the app, not the ad.

Do not touch bids or copy for the first 14 days. Google needs the data and you
need the patience. Changing things daily at this budget guarantees you learn
nothing.

---

## 9. A reminder

Google Ads is not the strongest channel available to you. The Play Store
listing, Facebook trade groups, Spanish YouTube/TikTok, and referral deals with
Spanish-speaking tax preparers all cost less and fit your customer better. Run
this test, keep it small, and do not let it crowd out those.
