require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./index");

async function seedTable(table, rows, mapper) {
  const countRow = await db.prepare(`SELECT COUNT(*) c FROM ${table}`).get();
  if (countRow.c > 0) {
    console.log(`- ${table}: already has ${countRow.c} rows, skipping`);
    return;
  }
  const cols = Object.keys(mapper(rows[0], 0));
  const placeholders = cols.map(() => "?").join(", ");
  const statements = rows.map((item, i) => {
    const mapped = mapper(item, i);
    return {
      sql: `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
      args: cols.map((c) => mapped[c]),
    };
  });
  await db.batch(statements);
  console.log(`- ${table}: inserted ${rows.length} rows`);
}

const STATS = [
  { value: 20, suffix: "+", label: "Countries served" },
  { value: 500, suffix: "+", label: "Projects completed" },
  { value: 15, suffix: "+", label: "Years experience" },
  { value: 40, suffix: "+", label: "Authorized brands" },
];

const DIVISIONS = [
  { name: "Green Energy", desc: "Solar PV, storage, hybrid systems", icon: "☀", images: ["64.jpg"], detailedDesc: "Comprehensive solar PV installations, industrial energy storage integration, and optimized hybrid power systems designed for grid independence and maximum sustainability." },
  { name: "Landscape Lighting", desc: "Urban, park & waterfront lighting", icon: "✦", images: ["204.jpg"], detailedDesc: "Custom architectural lighting design for urban environments, public parks, and premium waterfront properties. Energy-efficient LED configurations with automated smart timing." },
  { name: "Quality Home", desc: "Premium home materials & finishes", icon: "◈", images: ["IMG_1788 (1).PNG"], detailedDesc: "Premium residential construction materials, high-end finishes, and modern architectural design tailored for luxury, durability, and comfort." },
  { name: "Smart Cities", desc: "Connected poles, sensors, control", icon: "◉", images: ["134.jpg"], detailedDesc: "Connected infrastructure solutions including smart utility poles, environmental sensors, automated traffic control systems, and centralized IoT management dashboards." },
  { name: "Engineering", desc: "EPC, design & integration", icon: "⚙", images: ["83.jpg"], detailedDesc: "Full-scale Engineering, Procurement, and Construction (EPC) services. Turnkey project design, systems integration, and rigorous quality assurance management." },
  { name: "Display Screens", desc: "LED walls, media facades, transparent", icon: "▣", images: ["193.jpg", "191.png"], detailedDesc: "High-definition commercial LED walls, media facades, and futuristic transparent digital displays for advertising, corporate spaces, and public venues." },
  { name: "Construction", desc: "Civil works & installation", icon: "▲", images: ["144.jpg"], detailedDesc: "Heavy civil works, structural framing, foundation installation, and large-scale commercial building construction executed to the highest engineering standards." },
  { name: "Energy Storage", desc: "Residential to utility BESS", icon: "▮", images: ["IMG_1778.PNG"], detailedDesc: "Advanced Battery Energy Storage Systems (BESS) scalable from residential backup packs to massive utility-grade grid stabilization units." },
  { name: "New Energy Vehicles", desc: "EVs, motorcycles, chargers", icon: "▷", images: ["99.jpg", "96.png", "94.png"], detailedDesc: "Cutting-edge electric vehicle ecosystem support, including fleet EVs, electric motorcycles, and high-speed smart charging station networks." },
  { name: "Building Materials", desc: "Doors, windows, bathroom fittings", icon: "▤", images: ["782.jpg"], detailedDesc: "Supply of eco-friendly, ultra-durable building materials, advanced insulation, and sustainable structural components for green architecture." },
];

const COMPANIES = [
  { slug: "mashariki-life", name: "Mashariki Life", tag: "Parent Group", tagline: "The ecosystem. Green energy, smart lighting, and better living from the East." },
  { slug: "thinda", name: "Thinda", tag: "Lighting · Displays · Smart City", tagline: "Illuminating cities, stages and skylines with precision lighting and urban technology." },
  { slug: "thinko", name: "Thinko", tag: "Green Energy Technology", tagline: "Solar, storage, EV and energy management for homes, businesses and utilities." },
  { slug: "mashariki-groove", name: "Mashariki Groove", tag: "AV Experience · Creative Hub", tagline: "A premium AV experience center — where clients, partners and creators plug into our technology." },
];

const SOLUTION_SECTORS = [
  { name: "Residential", desc: "Rooftop solar, smart lighting, backup storage." },
  { name: "Commercial", desc: "C&I solar, facade lighting, display media." },
  { name: "Industrial", desc: "Yard lighting, microgrids, high-mast poles." },
  { name: "Government", desc: "Municipal projects, public safety lighting." },
  { name: "Municipal", desc: "Smart poles, road lighting, control systems." },
  { name: "Hospitality", desc: "Landscape & architectural lighting, AV." },
  { name: "Sports", desc: "Stadium & pitch lighting, LED perimeter." },
  { name: "Transportation", desc: "Airports, stations, roads, tunnels." },
  { name: "Education", desc: "Campus lighting, solar rooftops." },
  { name: "Healthcare", desc: "Backup power, ward & precinct lighting." },
];

const PRODUCT_CATEGORIES = [
  "Solar Panels", "Batteries", "Inverters", "Street Lights", "Flood Lights",
  "Landscape Lights", "Indoor Lights", "Stage Lights", "LED Displays",
  "Transparent LED", "Flexible LED", "Smart Poles", "Bathroom Products",
  "Doors", "Windows", "Electric Vehicles", "Electric Motorcycles", "EV Chargers",
];

const TEAM = [
  { name: "MKIZA L.", role: "Sales Manager", dept: "Management", bio: "Leads Mashariki Life's East Africa expansion, partnerships and vision.", image: "/mkizal.png" },
  { name: "HERVE K.", role: "Digital Marketing Specialist", dept: "IT agent", bio: "Drives R&D across solar, storage and smart city platforms.", image: "/hervek.png" },
  { name: "DOREEN L.", role: "MD, Thinda Lighting", dept: "Management", bio: "20+ years in urban and architectural lighting design.", image: null },
  { name: "MAGNE U.", role: "Human Resources", dept: "Employees", bio: "Commercial lead for utility, municipal and enterprise accounts.", image: null },
  { name: "wang N.", role: "Solar Design Lead", dept: "Engineering", bio: "Designs residential to utility-scale PV and hybrid systems.", image: null },
  { name: "david R.", role: "Marketing Director", dept: "Marketing", bio: "Owns the Mashariki brand ecosystem and communications.", image: null },
  { name: "lucian H.", role: "Operations Manager", dept: "Operations", bio: "EPC delivery, logistics and installation nationwide.", image: null },
  { name: "wlang B.", role: "Customer Success Lead", dept: "Support", bio: "Post-installation service, monitoring and warranties.", image: null },
  { name: "charlotte M.", role: "Customer Success Lead", dept: "Support", bio: "Post-installation service, monitoring and warranties.", image: null },
];

const NEWS = [
  { slug: "kigali-corridor-lighting", title: "Kigali corridor: 12 km of adaptive smart lighting goes live", category: "Projects", date: "2026-05-14", excerpt: "A new corridor lit with adaptive smart poles integrating sensors, cameras and dimming control." },
  { slug: "mashariki-groove-opening", title: "Mashariki Groove opens: AV experience meets premium hospitality", category: "Company News", date: "2026-04-02", excerpt: "The Groove flagship is now open — where partners can experience our lighting, display and stage tech." },
  { slug: "thinko-hybrid-launch", title: "Thinko launches next-gen residential hybrid solar kit", category: "Technology", date: "2026-03-10", excerpt: "A modular 3–15 kW hybrid platform with integrated storage and app-based management." },
  { slug: "east-africa-partnership", title: "New East Africa partnership expands utility-scale storage", category: "Press Releases", date: "2026-02-21", excerpt: "Strategic partnership to deploy 120 MWh of battery storage across three countries." },
  { slug: "stadium-relight", title: "National stadium relit with adaptive broadcast-grade LED", category: "Projects", date: "2026-01-18", excerpt: "Full pitch, perimeter and facade upgrade to broadcast-grade LED." },
  { slug: "innovation-lab", title: "Innovation lab opens in Kigali — smart city testbed", category: "Innovation", date: "2025-12-05", excerpt: "A live testbed for smart poles, sensors and micro-grid experimentation." },
];

const JOBS = [
  { slug: "solar-design-engineer", title: "Solar Design Engineer", location: "Kigali, Rwanda", type: "Full-time", team: "Engineering" },
  { slug: "lighting-designer", title: "Urban Lighting Designer", location: "Kigali, Rwanda", type: "Full-time", team: "Thinda" },
  { slug: "sales-manager", title: "Enterprise Sales Manager", location: "Nairobi, Kenya", type: "Full-time", team: "Sales" },
  { slug: "avl-technician", title: "AV & Lighting Technician", location: "Kigali, Rwanda", type: "Full-time", team: "Mashariki Groove" },
  { slug: "field-installer", title: "Field Installation Lead", location: "Multiple", type: "Full-time", team: "Operations" },
];

const PARTNERS = ["Huawei", "LONGi", "CATL", "Sungrow", "BYD", "Osram", "Signify", "Schneider", "ABB", "Siemens", "Growatt", "Trina"];

const TIMELINE = [
  { year: "2010", title: "Foundations laid", desc: "Early lighting and electrical projects in East Africa." },
  { year: "2015", title: "Group formed", desc: "Mashariki Life established, headquartered in Kigali." },
  { year: "2018", title: "Thinda launched", desc: "Dedicated lighting, displays and smart city arm." },
  { year: "2021", title: "Thinko launched", desc: "Green energy division for solar, storage and EV." },
  { year: "2024", title: "20+ countries", desc: "Delivery footprint expands across Africa." },
  { year: "2026", title: "Mashariki Groove", desc: "Premium AV experience & creative hub opens in Kigali." },
];

async function seedAll() {
  console.log("Initializing schema...");
  await db.init();

  console.log("Seeding database...");

  await seedTable("stats", STATS, (r, i) => ({ value: r.value, suffix: r.suffix, label: r.label, sort_order: i }));
  await seedTable("divisions", DIVISIONS, (r, i) => ({ name: r.name, desc: r.desc, icon: r.icon, images: JSON.stringify(r.images), detailed_desc: r.detailedDesc, sort_order: i }));
  await seedTable("companies", COMPANIES, (r, i) => ({ slug: r.slug, name: r.name, tag: r.tag, tagline: r.tagline, sort_order: i }));
  await seedTable("solution_sectors", SOLUTION_SECTORS, (r, i) => ({ name: r.name, desc: r.desc, sort_order: i }));
  await seedTable("product_categories", PRODUCT_CATEGORIES.map((name) => ({ name })), (r, i) => ({ name: r.name, sort_order: i }));
  await seedTable("team_members", TEAM, (r, i) => ({ name: r.name, role: r.role, dept: r.dept, bio: r.bio, image: r.image, sort_order: i }));
  await seedTable("news", NEWS, (r, i) => ({ slug: r.slug, title: r.title, category: r.category, date: r.date, excerpt: r.excerpt, body: "", sort_order: i }));
  await seedTable("jobs", JOBS, (r, i) => ({ slug: r.slug, title: r.title, location: r.location, type: r.type, team: r.team, description: "", is_open: 1, sort_order: i }));
  await seedTable("partners", PARTNERS.map((name) => ({ name })), (r, i) => ({ name: r.name, sort_order: i }));
  await seedTable("timeline", TIMELINE, (r, i) => ({ year: r.year, title: r.title, desc: r.desc, sort_order: i }));

  // Default admin user
  const adminCountRow = await db.prepare("SELECT COUNT(*) c FROM admin_users").get();
  if (adminCountRow.c === 0) {
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
    const hash = bcrypt.hashSync(password, 10);
    await db.prepare("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)").run(username, hash);
    console.log(`- admin_users: created default admin "${username}" (password: "${password}") — CHANGE THIS`);
  } else {
    console.log("- admin_users: already exists, skipping");
  }

  console.log("Seed complete.");
}

module.exports = { seedAll };

if (require.main === module) {
  seedAll()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
