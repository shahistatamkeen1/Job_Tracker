function profileKey(userEmail) {
  return `jobTrackerProfile:${(userEmail || "guest").toLowerCase()}`;
}

export function createDefaultProfile(userEmail) {
  const baseName = (userEmail || "user").split("@")[0] || "user";
  const fullName = baseName
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    fullName: fullName || "Your Name",
    headline: "Aspiring Professional",
    location: "City, Country",
    email: userEmail || "",
    phone: "",
    website: "",
    linkedin: "",
    about:
      "Write a concise professional summary that highlights your strengths, achievements, and career goals.",
    skills: [],
    experiences: [],
    projects: [],
    publications: [],
    certifications: [],
    achievements: [],
  };
}

export function getProfile(userEmail) {
  try {
    const raw = localStorage.getItem(profileKey(userEmail));
    if (!raw) return createDefaultProfile(userEmail);
    const parsed = JSON.parse(raw);
    return {
      ...createDefaultProfile(userEmail),
      ...parsed,
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experiences: Array.isArray(parsed.experiences) ? parsed.experiences : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      publications: Array.isArray(parsed.publications) ? parsed.publications : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    };
  } catch {
    return createDefaultProfile(userEmail);
  }
}

export function saveProfile(userEmail, profile) {
  localStorage.setItem(profileKey(userEmail), JSON.stringify(profile));
}

export function buildResumeText(profile) {
  const lines = [];

  lines.push(profile.fullName || "Your Name");
  lines.push([profile.email, profile.phone, profile.location].filter(Boolean).join(" | "));
  lines.push([profile.linkedin, profile.website].filter(Boolean).join(" | "));
  lines.push("");

  lines.push("PROFESSIONAL SUMMARY");
  lines.push(profile.about || "");
  lines.push("");

  if (profile.skills?.length) {
    lines.push("SKILLS");
    lines.push(profile.skills.join(", "));
    lines.push("");
  }

  if (profile.experiences?.length) {
    lines.push("EXPERIENCE");
    profile.experiences.forEach((exp) => {
      lines.push(`${exp.title || "Role"} - ${exp.company || "Company"}`);
      lines.push([exp.location, exp.startDate, exp.endDate].filter(Boolean).join(" | "));
      if (exp.description) lines.push(exp.description);
      lines.push("");
    });
  }

  if (profile.projects?.length) {
    lines.push("PROJECTS");
    profile.projects.forEach((project) => {
      lines.push(project.name || "Project");
      lines.push([project.link, project.tech].filter(Boolean).join(" | "));
      if (project.description) lines.push(project.description);
      lines.push("");
    });
  }

  if (profile.publications?.length) {
    lines.push("PUBLICATIONS");
    profile.publications.forEach((item) => {
      lines.push(item.title || "Publication");
      lines.push([item.publisher, item.date, item.link].filter(Boolean).join(" | "));
      if (item.description) lines.push(item.description);
      lines.push("");
    });
  }

  if (profile.certifications?.length) {
    lines.push("CERTIFICATIONS");
    profile.certifications.forEach((cert) => {
      lines.push(cert.name || "Certification");
      lines.push([cert.issuer, cert.issueDate, cert.credentialId, cert.link].filter(Boolean).join(" | "));
      lines.push("");
    });
  }

  if (profile.achievements?.length) {
    lines.push("ACHIEVEMENTS");
    profile.achievements.forEach((item) => {
      lines.push(item.title || "Achievement");
      lines.push([item.date].filter(Boolean).join(" | "));
      if (item.description) lines.push(item.description);
      lines.push("");
    });
  }

  return lines.join("\n").trim();
}
