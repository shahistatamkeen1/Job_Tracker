import { useMemo, useState } from "react";
import { buildResumeText, getProfile, saveProfile } from "../lib/profile";

const blankExperience = () => ({
  title: "",
  company: "",
  location: "",
  startDate: "",
  endDate: "",
  description: "",
});

const blankProject = () => ({ name: "", link: "", tech: "", description: "" });
const blankPublication = () => ({ title: "", publisher: "", date: "", link: "", description: "" });
const blankCertification = () => ({ name: "", issuer: "", issueDate: "", credentialId: "", link: "" });
const blankAchievement = () => ({ title: "", date: "", description: "" });

export default function UserProfile({ userEmail }) {
  const [profile, setProfile] = useState(() => getProfile(userEmail));
  const [skillInput, setSkillInput] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [showResumeInput, setShowResumeInput] = useState(false);

  const initials = useMemo(() => {
    return (profile.fullName || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  }, [profile.fullName]);

  const resumePreview = useMemo(() => buildResumeText(profile), [profile]);

  function updateField(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  function addSkill() {
    const skill = skillInput.trim();
    if (!skill) return;
    if (profile.skills.includes(skill)) {
      setSkillInput("");
      return;
    }
    setProfile((prev) => ({ ...prev, skills: [...prev.skills, skill] }));
    setSkillInput("");
  }

  function removeSkill(skill) {
    setProfile((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skill) }));
  }

  function addItem(section, factory) {
    setProfile((prev) => ({ ...prev, [section]: [...prev[section], factory()] }));
  }

  function updateItem(section, index, field, value) {
    setProfile((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }

  function removeItem(section, index) {
    setProfile((prev) => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }));
  }

  function persistProfile() {
    saveProfile(userEmail, profile);
    setSaveStatus("Profile saved");
    setTimeout(() => setSaveStatus(""), 1500);
  }

  async function extractProfileData() {
    if (!resumeText && !profile.linkedin) {
      alert("Please provide either a resume or LinkedIn URL");
      return;
    }

    setExtracting(true);
    try {
      const response = await fetch("http://localhost:8000/api/profile/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          linkedin_url: profile.linkedin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || data.error || "Failed to extract profile data");
        setExtracting(false);
        return;
      }

      // Merge extracted data with existing profile
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, ...(data.skills || [])].filter((v, i, a) => a.indexOf(v) === i), // Unique
        experiences: [...prev.experiences, ...(data.experiences || [])],
        projects: [...prev.projects, ...(data.projects || [])],
        publications: [...prev.publications, ...(data.publications || [])],
        certifications: [...prev.certifications, ...(data.certifications || [])],
        achievements: [...prev.achievements, ...(data.achievements || [])],
      }));

      setSaveStatus("Profile data extracted and merged!");
      setShowResumeInput(false);
      setResumeText("");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (error) {
      console.error("Error extracting profile:", error);
      alert("Error extracting profile data. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  async function extractProfileFromFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [".pdf", ".docx", ".doc"];
    const fileName = file.name.toLowerCase();
    const isValid = validTypes.some((type) => fileName.endsWith(type));

    if (!isValid) {
      alert("Please upload a valid resume file (PDF, DOCX, or DOC)");
      event.target.value = "";
      return;
    }

    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8000/api/profile/extract-from-file", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Failed to extract profile data from file");
        setExtracting(false);
        event.target.value = "";
        return;
      }

      // Merge extracted data with existing profile
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, ...(data.skills || [])].filter((v, i, a) => a.indexOf(v) === i),
        experiences: [...prev.experiences, ...(data.experiences || [])],
        projects: [...prev.projects, ...(data.projects || [])],
        publications: [...prev.publications, ...(data.publications || [])],
        certifications: [...prev.certifications, ...(data.certifications || [])],
        achievements: [...prev.achievements, ...(data.achievements || [])],
      }));

      setSaveStatus(`Profile extracted from ${file.name}!`);
      setShowResumeInput(false);
      setResumeText("");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (error) {
      console.error("Error extracting profile from file:", error);
      alert("Error extracting profile data from file. Please try again.");
    } finally {
      setExtracting(false);
      event.target.value = "";
    }
  }

  return (
    <section className="profile-page">
      <article className="card profile-hero">
        <div className="profile-cover" />
        <div className="profile-identity">
          <div className="profile-avatar">{initials || "U"}</div>
          <div>
            <h2>{profile.fullName || "Your Name"}</h2>
            <p className="profile-headline">{profile.headline || "Your Professional Headline"}</p>
            <p className="profile-meta">
              {profile.location || "Location"} · {userEmail}
            </p>
          </div>
        </div>
      </article>

      <article className="card">
        <h3>Profile Basics</h3>
        <div className="profile-form-grid">
          <input value={profile.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="Full Name" />
          <input value={profile.headline} onChange={(e) => updateField("headline", e.target.value)} placeholder="Headline" />
          <input value={profile.location} onChange={(e) => updateField("location", e.target.value)} placeholder="Location" />
          <input value={profile.email} onChange={(e) => updateField("email", e.target.value)} placeholder="Email" />
          <input value={profile.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="Phone" />
          <input value={profile.website} onChange={(e) => updateField("website", e.target.value)} placeholder="Website" />
          <input value={profile.linkedin} onChange={(e) => updateField("linkedin", e.target.value)} placeholder="LinkedIn URL" />
          <textarea rows={5} value={profile.about} onChange={(e) => updateField("about", e.target.value)} placeholder="Professional Summary / About" />
        </div>
        
        <div className="section-topline" style={{ marginTop: "16px" }}>
          <h4>Auto-Extract Profile Data</h4>
          <button type="button" className="secondary-btn" onClick={() => setShowResumeInput(!showResumeInput)}>
            {showResumeInput ? "Hide" : "Upload Resume or Paste Text"}
          </button>
        </div>
        
        {showResumeInput && (
          <div style={{ marginTop: "12px" }}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>
                Upload Resume File (PDF, DOCX, DOC)
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={extractProfileFromFile}
                disabled={extracting}
                style={{ marginBottom: "12px" }}
              />
            </div>

            <div style={{ textAlign: "center", color: "#999", marginBottom: "12px" }}>OR</div>

            <textarea
              rows={6}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume content here"
              style={{ width: "100%", marginBottom: "8px" }}
            />
            <button
              type="button"
              className="primary"
              onClick={extractProfileData}
              disabled={extracting || (!resumeText && !profile.linkedin)}
            >
              {extracting ? "Extracting..." : "Extract & Auto-Fill from Text"}
            </button>
            <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "8px" }}>
              Upload a resume file or paste text to automatically populate skills, experience, projects, certifications, and achievements.
            </p>
          </div>
        )}
      </article>

      <article className="card">
        <div className="section-topline">
          <h3>Skills</h3>
          <div className="inline-form profile-inline">
            <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Add a skill" />
            <button type="button" onClick={addSkill}>Add</button>
          </div>
        </div>
        <div className="pill-row">
          {profile.skills.map((skill) => (
            <button key={skill} type="button" className="pill profile-pill" onClick={() => removeSkill(skill)}>
              {skill} x
            </button>
          ))}
        </div>
      </article>

      <article className="card">
        <div className="section-topline">
          <h3>Experience</h3>
          <button type="button" className="secondary-btn" onClick={() => addItem("experiences", blankExperience)}>
            Add Experience
          </button>
        </div>
        <div className="profile-list-grid">
          {profile.experiences.map((item, index) => (
            <div key={`exp-${index}`} className="profile-entry">
              <div className="profile-form-grid compact">
                <input value={item.title} onChange={(e) => updateItem("experiences", index, "title", e.target.value)} placeholder="Role" />
                <input value={item.company} onChange={(e) => updateItem("experiences", index, "company", e.target.value)} placeholder="Company" />
                <input value={item.location} onChange={(e) => updateItem("experiences", index, "location", e.target.value)} placeholder="Location" />
                <input value={item.startDate} onChange={(e) => updateItem("experiences", index, "startDate", e.target.value)} placeholder="Start Date" />
                <input value={item.endDate} onChange={(e) => updateItem("experiences", index, "endDate", e.target.value)} placeholder="End Date / Present" />
                <textarea rows={3} value={item.description} onChange={(e) => updateItem("experiences", index, "description", e.target.value)} placeholder="Impact and responsibilities" />
              </div>
              <button type="button" className="danger" onClick={() => removeItem("experiences", index)}>Remove</button>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <div className="section-topline">
          <h3>Projects</h3>
          <button type="button" className="secondary-btn" onClick={() => addItem("projects", blankProject)}>
            Add Project
          </button>
        </div>
        <div className="profile-list-grid">
          {profile.projects.map((item, index) => (
            <div key={`project-${index}`} className="profile-entry">
              <div className="profile-form-grid compact">
                <input value={item.name} onChange={(e) => updateItem("projects", index, "name", e.target.value)} placeholder="Project Name" />
                <input value={item.link} onChange={(e) => updateItem("projects", index, "link", e.target.value)} placeholder="Project Link" />
                <input value={item.tech} onChange={(e) => updateItem("projects", index, "tech", e.target.value)} placeholder="Technologies Used" />
                <textarea rows={3} value={item.description} onChange={(e) => updateItem("projects", index, "description", e.target.value)} placeholder="What you built and results" />
              </div>
              <button type="button" className="danger" onClick={() => removeItem("projects", index)}>Remove</button>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <div className="section-topline">
          <h3>Publications</h3>
          <button type="button" className="secondary-btn" onClick={() => addItem("publications", blankPublication)}>
            Add Publication
          </button>
        </div>
        <div className="profile-list-grid">
          {profile.publications.map((item, index) => (
            <div key={`pub-${index}`} className="profile-entry">
              <div className="profile-form-grid compact">
                <input value={item.title} onChange={(e) => updateItem("publications", index, "title", e.target.value)} placeholder="Title" />
                <input value={item.publisher} onChange={(e) => updateItem("publications", index, "publisher", e.target.value)} placeholder="Publisher / Journal" />
                <input value={item.date} onChange={(e) => updateItem("publications", index, "date", e.target.value)} placeholder="Publication Date" />
                <input value={item.link} onChange={(e) => updateItem("publications", index, "link", e.target.value)} placeholder="Publication Link" />
                <textarea rows={3} value={item.description} onChange={(e) => updateItem("publications", index, "description", e.target.value)} placeholder="Summary" />
              </div>
              <button type="button" className="danger" onClick={() => removeItem("publications", index)}>Remove</button>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <div className="section-topline">
          <h3>Certifications</h3>
          <button type="button" className="secondary-btn" onClick={() => addItem("certifications", blankCertification)}>
            Add Certification
          </button>
        </div>
        <div className="profile-list-grid">
          {profile.certifications.map((item, index) => (
            <div key={`cert-${index}`} className="profile-entry">
              <div className="profile-form-grid compact">
                <input value={item.name} onChange={(e) => updateItem("certifications", index, "name", e.target.value)} placeholder="Certification Name" />
                <input value={item.issuer} onChange={(e) => updateItem("certifications", index, "issuer", e.target.value)} placeholder="Issuer" />
                <input value={item.issueDate} onChange={(e) => updateItem("certifications", index, "issueDate", e.target.value)} placeholder="Issue Date" />
                <input value={item.credentialId} onChange={(e) => updateItem("certifications", index, "credentialId", e.target.value)} placeholder="Credential ID" />
                <input value={item.link} onChange={(e) => updateItem("certifications", index, "link", e.target.value)} placeholder="Credential URL" />
              </div>
              <button type="button" className="danger" onClick={() => removeItem("certifications", index)}>Remove</button>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <div className="section-topline">
          <h3>Achievements</h3>
          <button type="button" className="secondary-btn" onClick={() => addItem("achievements", blankAchievement)}>
            Add Achievement
          </button>
        </div>
        <div className="profile-list-grid">
          {profile.achievements.map((item, index) => (
            <div key={`achievement-${index}`} className="profile-entry">
              <div className="profile-form-grid compact">
                <input value={item.title} onChange={(e) => updateItem("achievements", index, "title", e.target.value)} placeholder="Achievement Title" />
                <input value={item.date} onChange={(e) => updateItem("achievements", index, "date", e.target.value)} placeholder="Date" />
                <textarea rows={3} value={item.description} onChange={(e) => updateItem("achievements", index, "description", e.target.value)} placeholder="Impact / details" />
              </div>
              <button type="button" className="danger" onClick={() => removeItem("achievements", index)}>Remove</button>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <div className="section-topline">
          <h3>Resume Preview (Auto-generated from Profile)</h3>
          <button type="button" onClick={persistProfile}>Save Profile</button>
        </div>
        {saveStatus && <p>{saveStatus}</p>}
        <textarea rows={14} value={resumePreview} readOnly />
      </article>
    </section>
  );
}
