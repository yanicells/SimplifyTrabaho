import { describe, expect, it } from "vitest";
import { categorize, categorizeLevel, categorizeFunction } from "../src/categorize.js";

describe("categorizeLevel", () => {
  it("detects internships, including PH terms", () => {
    expect(categorizeLevel("Software Engineering Intern")).toBe("internship");
    expect(categorizeLevel("Internship Program - Marketing")).toBe("internship");
    expect(categorizeLevel("OJT - Accounting Department")).toBe("internship");
    expect(categorizeLevel("On-the-Job Trainee")).toBe("internship");
    expect(categorizeLevel("Practicum Student")).toBe("internship");
    expect(categorizeLevel("Apprentice Technician")).toBe("internship");
  });

  it("detects entry level, including PH terms", () => {
    expect(categorizeLevel("Junior Accountant")).toBe("entry");
    expect(categorizeLevel("Jr. Software Developer")).toBe("entry");
    expect(categorizeLevel("Entry-Level Analyst")).toBe("entry");
    expect(categorizeLevel("Fresh Grad Hiring - Operations")).toBe("entry");
    expect(categorizeLevel("Management Trainee")).toBe("entry");
    expect(categorizeLevel("Cadet Engineering Program")).toBe("entry");
    expect(categorizeLevel("Financial Operations Associate (Recons)")).toBe("entry");
  });

  it("treats internship markers as stronger than entry markers", () => {
    expect(categorizeLevel("Fresh Grad Internship")).toBe("internship");
  });

  it("does not treat Senior Associate as entry", () => {
    expect(categorizeLevel("Senior Associate")).toBe("senior");
    expect(categorizeLevel("Sr. Associate, Tax")).toBe("senior");
  });

  it("detects senior level", () => {
    expect(categorizeLevel("Senior Software Engineer")).toBe("senior");
    expect(categorizeLevel("Sr Backend Engineer")).toBe("senior");
    expect(categorizeLevel("Engineering Lead")).toBe("senior");
    expect(categorizeLevel("Principal Architect")).toBe("senior");
    expect(categorizeLevel("Staff Software Engineer")).toBe("senior");
    expect(categorizeLevel("Head of Design")).toBe("senior");
    expect(categorizeLevel("Account Manager")).toBe("senior");
    expect(categorizeLevel("Director of Operations")).toBe("senior");
    expect(categorizeLevel("VP, Finance")).toBe("senior");
    expect(categorizeLevel("Chief Financial Officer")).toBe("senior");
  });

  it("does not treat bare 'Officer' titles as senior (PH staff-level convention)", () => {
    // "officer" in SPEC §9 means C-level; PH titles like "HR Officer" are staff roles.
    expect(categorizeLevel("HR Officer")).toBe("unknown");
    expect(categorizeLevel("Customer Service Officer")).toBe("unknown");
  });

  it("treats supervisors and team leaders as senior (PH BPO convention)", () => {
    expect(categorizeLevel("Accounts Payable Supervisor")).toBe("senior");
    expect(categorizeLevel("Swine Farm Supervisor (Stay-In Set Up)")).toBe("senior");
    expect(categorizeLevel("Team Leader")).toBe("senior");
    expect(categorizeLevel("Customer Service Team Leader")).toBe("senior");
  });

  it("does not treat 'Leadership' program titles as senior", () => {
    expect(categorizeLevel("Leadership Development Program")).toBe("unknown");
  });

  it("treats BPO frontline rep titles as entry (CSR/TSR/SDR)", () => {
    expect(categorizeLevel("Customer Service Representative")).toBe("entry");
    expect(categorizeLevel("CSR (Voice)")).toBe("entry");
    expect(categorizeLevel("Technical Support Representative")).toBe("entry");
    expect(categorizeLevel("Customer Support Representative")).toBe("entry");
    expect(categorizeLevel("Sales Development Representative (SDR)")).toBe("entry");
  });

  it("ranks explicit seniority above frontline rep markers", () => {
    expect(categorizeLevel("Senior Customer Service Representative")).toBe("senior");
    expect(categorizeLevel("Customer Service Representative II")).toBe("mid");
  });

  it("detects mid level only from explicit markers", () => {
    expect(categorizeLevel("Mid-Level Designer")).toBe("mid");
    expect(categorizeLevel("Intermediate Developer")).toBe("mid");
    expect(categorizeLevel("Software Engineer II")).toBe("mid");
    expect(categorizeLevel("Software Engineer III")).toBe("mid");
  });

  it("defaults to unknown, never assumes mid", () => {
    expect(categorizeLevel("Software Engineer")).toBe("unknown");
    expect(categorizeLevel("Risk Operations Analyst")).toBe("unknown");
  });

  it("detects '-Mid' suffixes and '(MID)' markers without matching shift names", () => {
    // Real BPO title patterns: the level rides the title, "Mid Shift" is a schedule.
    expect(categorizeLevel("2026-7967 Underwriting Service Specialist-Mid")).toBe("mid");
    expect(categorizeLevel("2026-7964 Finance Analyst-Mid (Mid Shift)")).toBe("mid");
    expect(categorizeLevel("Quality Assurance Engineer (MID)")).toBe("mid");
    expect(categorizeLevel("Software Engineer (Backend) | Mid")).toBe("mid");
    // "Mid Shift" alone is NOT a level marker
    expect(categorizeLevel("Accountant (Mid Shift)")).toBe("unknown");
    expect(categorizeLevel("2026-7854 Software Engineer (Mid Shift)")).toBe("unknown");
    expect(categorizeLevel("CSR (Mid Shift)")).toBe("entry");
    // "Midwife" must not match
    expect(categorizeLevel("Midwife")).toBe("unknown");
  });

  it("treats a trailing roman 'I' rung as entry (Level I, Analyst I)", () => {
    expect(categorizeLevel("Software Engineer - Level I (Bench)")).toBe("entry");
    expect(categorizeLevel("Laboratory Analyst I (Subic)")).toBe("entry");
    expect(categorizeLevel("Laboratory Analyst I - Multilab")).toBe("entry");
    // lowercase i / mid-word capitals must not match
    expect(categorizeLevel("IT Support Specialist")).toBe("unknown");
    expect(categorizeLevel("Team International Lead")).toBe("senior");
  });

  it("does not treat 'Lead Generation' as a leadership marker", () => {
    expect(categorizeLevel("Lead Generation Specialist")).toBe("unknown");
    expect(categorizeLevel("Lead Generation Supervisor")).toBe("senior");
    expect(categorizeLevel("Senior Lead Generation & Email Outreach Specialist")).toBe(
      "senior",
    );
  });
});

describe("categorizeFunction", () => {
  it("maps titles to functions", () => {
    expect(categorizeFunction("Software Engineer")).toBe("engineering");
    expect(categorizeFunction("Backend Developer")).toBe("engineering");
    expect(categorizeFunction("QA Tester")).toBe("engineering");
    expect(categorizeFunction("Data Analyst")).toBe("data");
    expect(categorizeFunction("Machine Learning Researcher")).toBe("data");
    expect(categorizeFunction("UX Designer")).toBe("design");
    expect(categorizeFunction("Product Manager")).toBe("product");
    expect(categorizeFunction("SEO Specialist")).toBe("marketing");
    expect(categorizeFunction("Account Executive")).toBe("sales");
    expect(categorizeFunction("Business Development Representative")).toBe("sales");
    expect(categorizeFunction("Treasury Analyst")).toBe("finance");
    expect(categorizeFunction("Talent Acquisition Partner")).toBe("hr");
    expect(categorizeFunction("Supply Chain Coordinator")).toBe("operations");
    expect(categorizeFunction("Customer Success Generalist (Daylight)")).toBe(
      "customer-support",
    );
    expect(categorizeFunction("CSR - Night Shift")).toBe("customer-support");
    expect(categorizeFunction("Compliance Manager")).toBe("legal");
  });

  it("maps PH back-office finance vocabulary to finance", () => {
    expect(categorizeFunction("Bookkeeper")).toBe("finance");
    expect(categorizeFunction("Accounts Payable Specialist")).toBe("finance");
    expect(categorizeFunction("Accounts Receivable Analyst")).toBe("finance");
    expect(categorizeFunction("Billing Specialist")).toBe("finance");
    expect(categorizeFunction("Record To Report Specialist")).toBe("finance");
    expect(categorizeFunction("Procure to Pay Supervisor (AP/Payments)")).toBe("finance");
    expect(categorizeFunction("(FA) Fixed Asset Specialist")).toBe("finance");
    expect(categorizeFunction("Estimator")).toBe("finance");
  });

  it("maps VA/admin and back-office ops vocabulary to operations", () => {
    expect(categorizeFunction("Virtual Assistant")).toBe("operations");
    expect(categorizeFunction("Real Estate Virtual Assistant")).toBe("operations");
    expect(categorizeFunction("Executive Assistant")).toBe("operations");
    expect(categorizeFunction("Warehouse Associate")).toBe("operations");
    expect(categorizeFunction("Workforce Analyst")).toBe("operations");
    expect(categorizeFunction("Purchasing Coordinator")).toBe("operations");
    expect(categorizeFunction("Dispatcher")).toBe("operations");
  });

  it("maps account management to sales", () => {
    expect(categorizeFunction("Account Manager")).toBe("sales");
    expect(categorizeFunction("Technical Account Manager")).toBe("sales");
  });

  it("maps CX vocabulary to customer-support", () => {
    expect(categorizeFunction("Customer Experience Associate")).toBe("customer-support");
    expect(categorizeFunction("Client Success Manager")).toBe("customer-support");
    expect(categorizeFunction("TSR - Day Shift")).toBe("customer-support");
  });

  it("maps IT administration to engineering", () => {
    expect(categorizeFunction("L3 Systems Administrator")).toBe("engineering");
    expect(categorizeFunction("Network Administrator")).toBe("engineering");
  });

  it("maps creative production and ads vocabulary", () => {
    expect(categorizeFunction("Video Editor")).toBe("design");
    expect(categorizeFunction("Paid Ads Specialist")).toBe("marketing");
    expect(categorizeFunction("Copywriter")).toBe("marketing");
    expect(categorizeFunction("Junior CRM Specialist")).toBe("marketing");
  });

  it("maps training/L&D to hr, after earlier rows", () => {
    expect(categorizeFunction("Safety Trainer")).toBe("hr");
    expect(categorizeFunction("Training Associate")).toBe("hr");
    expect(categorizeFunction("Sales Trainer")).toBe("sales");
  });

  it("falls back to other instead of guessing", () => {
    expect(categorizeFunction("Area Manager (Cagayan De Oro)")).toBe("other");
    // Deliberately unmapped: no project-management bucket in the enum.
    expect(categorizeFunction("Project Manager")).toBe("other");
    expect(categorizeFunction("GBS Specialist")).toBe("other");
    // Agriculture/science have no bucket (SEEK gap) — stay other, never guess.
    expect(categorizeFunction("Swine Farm Supervisor (Stay-In Set Up)")).toBe("other");
    expect(categorizeFunction("Laboratory Analyst II - Multilab")).toBe("other");
  });

  it("checks the table in SPEC §9 order — engineering before data", () => {
    expect(categorizeFunction("Data Engineer")).toBe("engineering");
  });

  // ——— schema v2: six new SEEK-aligned tables (SPEC §9), keywords mined from data ———

  it("maps healthcare titles", () => {
    expect(categorizeFunction("2026-7968 Company Nurse (Mid Shift)")).toBe("healthcare");
    expect(categorizeFunction("Licensed Vocational Nurse/ Licensed Practical Nurse")).toBe(
      "healthcare",
    );
    expect(categorizeFunction("Medical Biller and Coder (Remote)")).toBe("healthcare");
    expect(categorizeFunction("Remote Patient Care Coordinator (NCLEX)")).toBe("healthcare");
    expect(categorizeFunction("Medical Scribe")).toBe("healthcare");
    expect(categorizeFunction("Telehealth Professional")).toBe("healthcare");
    expect(categorizeFunction("Prior Authorization Specialist")).toBe("healthcare");
    expect(categorizeFunction("Utilization Review Nurse")).toBe("healthcare");
    expect(
      categorizeFunction("Clinical Documentation Associate - Licensed Physical Therapist"),
    ).toBe("healthcare");
    expect(categorizeFunction("Farm Veterinarian - Biosecurity & Veterinary Programs")).toBe(
      "healthcare",
    );
    expect(categorizeFunction("Pharmacist")).toBe("healthcare");
    expect(categorizeFunction("Dental Assistant")).toBe("healthcare");
    expect(categorizeFunction("Caregiver")).toBe("healthcare");
    expect(categorizeFunction("USRN Case Manager")).toBe("healthcare");
    expect(categorizeFunction("Authorizations Specialist | US Healthcare Insurance")).toBe(
      "healthcare",
    );
  });

  it("maps the medical-VA pre-rule ahead of the operations VA rule", () => {
    expect(categorizeFunction("Medical VA (Spanish Bilingual)")).toBe("healthcare");
    expect(categorizeFunction("Medical VA (Virtual Nurse US RN Needed)")).toBe("healthcare");
    expect(categorizeFunction("Real Estate Virtual Assistant")).toBe("operations");
  });

  it("does not treat a BPO 'Healthcare Account' as a healthcare role", () => {
    expect(categorizeFunction("Team Lead (Individual Contributor) | Healthcare Account")).toBe(
      "other",
    );
  });

  it("maps education titles", () => {
    expect(categorizeFunction("Education Professional")).toBe("education");
    expect(categorizeFunction("English Teacher")).toBe("education");
    expect(categorizeFunction("ESL Tutor (Online)")).toBe("education");
    expect(categorizeFunction("Math Instructor")).toBe("education");
    expect(categorizeFunction("Registrar")).toBe("education");
  });

  it("maps hospitality titles", () => {
    expect(categorizeFunction("Housekeeping Staff (Mandaluyong)")).toBe("hospitality");
    expect(categorizeFunction("Guest Services Associate (Remote) - PHILIPPINES ONLY")).toBe(
      "hospitality",
    );
    expect(categorizeFunction("AU Event Concierge (018-943)")).toBe("hospitality");
    expect(categorizeFunction("GDS Travel Specialist")).toBe("hospitality");
    expect(categorizeFunction("Ticketing Member | Remote | Luxury Travel")).toBe(
      "hospitality",
    );
    expect(categorizeFunction("Barista")).toBe("hospitality");
    expect(categorizeFunction("Chef de Partie")).toBe("hospitality");
    expect(categorizeFunction("Front Desk Receptionist")).toBe("hospitality");
  });

  it("maps manufacturing titles conservatively (specific combos, not bare words)", () => {
    expect(categorizeFunction("Production Associate")).toBe("manufacturing");
    expect(categorizeFunction("Machine Operator")).toBe("manufacturing");
    expect(categorizeFunction("Quality Assurance Inspector")).toBe("manufacturing");
    expect(categorizeFunction("Quality Control Specialist (Registered Chemist)")).toBe(
      "manufacturing",
    );
    expect(categorizeFunction("Conformance Analyst - Chemical")).toBe("manufacturing");
    expect(categorizeFunction("Farm Maintenance Technician")).toBe("manufacturing");
    expect(categorizeFunction("Electrical Technician")).toBe("manufacturing");
    expect(categorizeFunction("Mechanical Technician (Refrigeration)")).toBe("manufacturing");
    expect(categorizeFunction("Welder")).toBe("manufacturing");
    expect(categorizeFunction("Plant Manager")).toBe("manufacturing");
    expect(categorizeFunction("Assembler")).toBe("manufacturing");
    // bare "maintenance"/"production" stay unmatched — real counterexamples:
    expect(categorizeFunction("Website Maintenance")).toBe("other");
    expect(categorizeFunction("Events & Production Coordinator")).toBe("other");
  });

  it("keeps creative production roles in design, ahead of manufacturing", () => {
    expect(categorizeFunction("Production Artist")).toBe("design");
    expect(categorizeFunction("Graphic Artist")).toBe("design");
  });

  it("maps retail titles", () => {
    expect(categorizeFunction("Cashier")).toBe("retail");
    expect(categorizeFunction("Branch Manager (Cebu) - #34953")).toBe("retail");
    expect(categorizeFunction("Commercial Manager - Retail (BGC Taguig) - #35100")).toBe(
      "retail",
    );
    expect(categorizeFunction("Store Supervisor")).toBe("retail");
    expect(categorizeFunction("Visual Merchandising Specialist")).toBe("retail");
  });

  it("maps construction and property titles", () => {
    expect(categorizeFunction("Assistant Project Manager | Construction")).toBe(
      "construction",
    );
    expect(categorizeFunction("Architectural Drafter")).toBe("construction");
    expect(categorizeFunction("Architect (Revit) - Work From Home")).toBe("construction");
    expect(categorizeFunction("Property Manager (009-00437)")).toBe("construction");
    expect(categorizeFunction("Real Estate Cold Caller Full Time or Part-time")).toBe(
      "sales", // cold calling is sales work — the v1 extension wins by table order
    );
    expect(categorizeFunction("Foreman")).toBe("construction");
    expect(categorizeFunction("Electrician")).toBe("construction");
    expect(categorizeFunction("Plumber")).toBe("construction");
    expect(categorizeFunction("Quantity Surveyor")).toBe("construction");
  });

  it("routes site/civil/structural engineers to construction, bare engineers stay", () => {
    expect(categorizeFunction("Site Engineer")).toBe("construction");
    expect(categorizeFunction("Civil Engineer")).toBe("construction");
    expect(categorizeFunction("Structural Engineer")).toBe("construction");
    expect(categorizeFunction("Software Engineer")).toBe("engineering");
    expect(categorizeFunction("Site Reliability Engineer")).toBe("engineering");
  });

  // ——— v1 table extensions mined from the live dataset (eval-categorizer output) ———

  it("maps mined sales vocabulary", () => {
    expect(categorizeFunction("Lead Generation Specialist")).toBe("sales");
    expect(categorizeFunction("Appointment Setter")).toBe("sales");
    expect(categorizeFunction("Real Estate Cold Caller")).toBe("sales");
    expect(categorizeFunction("Territory Business Manager-Gamefowl")).toBe("sales");
    expect(categorizeFunction("Strategic Partnership Consultant")).toBe("sales");
  });

  it("maps mined finance vocabulary (risk, underwriting, actuarial, R2R)", () => {
    expect(categorizeFunction("Senior Risk Analyst")).toBe("finance");
    expect(categorizeFunction("2026-7845 Underwriting Service Associate")).toBe("finance");
    expect(categorizeFunction("2026-7934 Actuarial Analyst (Mid Shift)")).toBe("finance");
    expect(categorizeFunction("R2R Process Expert")).toBe("finance");
    expect(categorizeFunction("OTC Trading Director (For Pooling)")).toBe("finance");
  });

  it("maps mined compliance vocabulary to legal", () => {
    expect(categorizeFunction("AML Transaction Monitoring Analyst (PH)")).toBe("legal");
    expect(categorizeFunction("KYC Associate")).toBe("legal");
    expect(categorizeFunction("Money Laundering Reporting Officer (MLRO)")).toBe("legal");
  });

  it("maps mined support/operations vocabulary", () => {
    expect(categorizeFunction("Client Service Team Lead - Luxury Travel")).toBe(
      "customer-support",
    );
    expect(categorizeFunction("Aprio PH - Service Desk Analyst (Makati)")).toBe(
      "customer-support",
    );
    expect(categorizeFunction("Back Office Associate | Healthcare Account")).toBe(
      "operations",
    );
    expect(categorizeFunction("Mechanical/HVAC Fabrication VA (023-892)")).toBe("operations");
    expect(categorizeFunction("2026-7942 Optimization Lead — Managed Service Delivery")).toBe(
      "operations",
    );
  });

  it("maps mined marketing/data/engineering vocabulary", () => {
    expect(categorizeFunction("Google and Meta Ads Manager")).toBe("marketing");
    expect(categorizeFunction("Campaign Manager")).toBe("marketing");
    expect(categorizeFunction("Supplier - MDM Analyst")).toBe("data");
    expect(categorizeFunction("CMS Administrator")).toBe("engineering");
  });

  // ——— mining round 2 (eval-categorizer over the v2 tables) ———

  it("maps mined engineering/data vocabulary: BI, frontend, infosec, systems analysts", () => {
    expect(categorizeFunction("BI Senior Manager")).toBe("data");
    expect(categorizeFunction("Frontend Senior Manager")).toBe("engineering");
    expect(categorizeFunction("Backend Senior Manager")).toBe("engineering");
    expect(categorizeFunction("InfoSec Manager")).toBe("engineering");
    expect(categorizeFunction("2025-7561_Senior Business Analyst")).toBe("other"); // bare BA stays
    expect(categorizeFunction("Business Systems Analyst-Senior (Nightshift)")).toBe(
      "engineering",
    );
  });

  it("maps mined creative vocabulary to design", () => {
    expect(categorizeFunction("Creative Lead")).toBe("design");
    expect(categorizeFunction("Art Director")).toBe("design");
    expect(categorizeFunction("3D Animator - KingsIsle (Cebu - Onsite)")).toBe("design");
    expect(categorizeFunction("Senior Producer")).toBe("design");
  });

  it("maps mined marketing vocabulary: CRM platforms, PR, paid search, ambassadors", () => {
    expect(categorizeFunction("Salesforce Administrator")).toBe("marketing");
    expect(categorizeFunction("HubSpot Specialist")).toBe("marketing");
    expect(categorizeFunction("Public Relations Assistant Supervisor")).toBe("marketing");
    expect(categorizeFunction("Paid Search Specialist")).toBe("marketing");
    expect(categorizeFunction("Coins Student Ambassador")).toBe("marketing");
    expect(categorizeFunction("Community Manager")).toBe("marketing");
    // "Community Association Manager" is property management, not social media
    expect(
      categorizeFunction("Property Manager (Assistant Community Association Manager)"),
    ).toBe("construction");
  });

  it("maps mined sales vocabulary: renewals, deal desk, bids, partner solutions", () => {
    expect(categorizeFunction("Associate Renewals Manager")).toBe("sales");
    expect(categorizeFunction("Deal Desk Coordinator")).toBe("sales");
    expect(categorizeFunction("Bids & Proposals Specialist")).toBe("sales");
    expect(categorizeFunction("Partner Solutions Associate (with Sign On Bonus)")).toBe(
      "sales",
    );
    expect(categorizeFunction("Partner Onboarding Solutions Director")).toBe("sales");
    // "Talent Acquisition Partner" must stay hr — bare "partner" is not a sales marker
    expect(categorizeFunction("Talent Acquisition Partner")).toBe("hr");
  });

  it("maps mined finance vocabulary: collections, payments, controllers, valuation", () => {
    expect(categorizeFunction("Collections Manager")).toBe("finance");
    expect(categorizeFunction("Crypto Settlement Associate")).toBe("finance");
    expect(categorizeFunction("Payments Product Junior Manager (PH)")).toBe("finance");
    expect(categorizeFunction("US Controller (Philippines)")).toBe("finance");
    expect(categorizeFunction("Head of Trade Manager")).toBe("finance");
    expect(categorizeFunction("Aprio PH - Senior Associate, Business Valuation")).toBe(
      "finance",
    );
    expect(categorizeFunction("Remedial Officer")).toBe("finance");
    expect(categorizeFunction("2026-7923 Catastrophe Modeling Analyst-Mid (Nightshift)")).toBe(
      "finance",
    );
    // document controllers are construction admin, not financial controllers
    expect(categorizeFunction("Junior Document Controller (Construction)")).toBe(
      "construction",
    );
  });

  it("maps fraud prevention to legal/compliance", () => {
    expect(categorizeFunction("Fraud Prevention Specialist")).toBe("legal");
  });

  it("maps mined operations vocabulary: orders, facilities, gig-driver ops, verifications", () => {
    expect(categorizeFunction("Order Processing Associate")).toBe("operations");
    expect(categorizeFunction("(Remote) Order Management Specialist - #35091")).toBe(
      "operations",
    );
    expect(categorizeFunction("Facilities Coordinator")).toBe("operations");
    expect(categorizeFunction("Associate, Demand Planning")).toBe("operations");
    expect(categorizeFunction("Track and Trace Specialist")).toBe("operations");
    expect(categorizeFunction("Driver Services Associate")).toBe("operations");
    expect(categorizeFunction("Verifications Specialist")).toBe("operations");
    expect(categorizeFunction("Service Excellence Associate")).toBe("operations");
    expect(categorizeFunction("Senior Group Manager - Transactional Quality")).toBe(
      "operations",
    );
  });

  it("maps mined support/healthcare/retail vocabulary", () => {
    expect(categorizeFunction("Account Advocate")).toBe("customer-support");
    expect(categorizeFunction("Care Coordinator")).toBe("healthcare");
    expect(categorizeFunction("Ecommerce Manager (Remote) | Philippines")).toBe("retail");
  });
});

describe("categorize", () => {
  it("returns level and function together", () => {
    expect(categorize("Employee Relations Intern")).toEqual({
      level: "internship",
      function: "hr",
    });
  });
});
