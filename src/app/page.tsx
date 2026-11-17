"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type Role = "admin" | "teacher" | "student";
type View = "overview" | "students" | "subjects" | "teachers" | "lessons" | "attendance" | "feedback" | "team";
type Student = { id: string; name: string; registration: string; email: string; password: string; gradeLevel: "1º" | "2º" | "3º"; classGroup: "Desenvolvimento A" | "Desenvolvimento B"; avatar?: string };
type Subject = { id: string; name: string; code: string; weight1: number; weight2: number; componentWeights: [number, number, number, number] };
type GradeEntry = { firstParts: [number | null, number | null, number | null, number | null]; second: number | null };
type GradeMap = Record<string, GradeEntry>;
type Teacher = { id: string; name: string; email: string; password: string; subjectIds: string[]; avatar?: string };
type Lesson = { id: string; teacherId: string; subjectId: string; date: string; term: number; classGroup: string; gradeLevel: string; content: string; attendance: Record<string, boolean> };
type Feedback = { id: string; teacherId: string; studentId: string; subjectId: string; date: string; message: string };
type AppData = { students: Student[]; subjects: Subject[]; teachers: Teacher[]; grades: GradeMap; lessons: Lesson[]; feedback: Feedback[]; adminPhoto?: string };

const STORAGE_KEY = "nexo-escolar-secure-v3";
const ADMIN_EMAIL = "admin@escola.com";
const ADMIN_PASSWORD = "admin123";
const initialStudents: Student[] = [
  ["s1", "Ana Clara Ribeiro", "2026001", "ana.ribeiro@aluno.edu.br"], ["s2", "Bruno Martins Costa", "2026002", "bruno.costa@aluno.edu.br"],
  ["s3", "Camila Oliveira Santos", "2026003", "camila.santos@aluno.edu.br"], ["s4", "Daniel Ferreira Lima", "2026004", "daniel.lima@aluno.edu.br"],
].map(([id, name, registration, email]) => ({ id, name, registration, email, password: "aluno123", gradeLevel: "2º" as const, classGroup: "Desenvolvimento A" as const }));
const initialSubjects: Subject[] = [
  { id: "d1", name: "Matemática", code: "MAT-01", weight1: 1, weight2: 1, componentWeights: [2.5, 2.5, 2.5, 2.5] },
  { id: "d2", name: "Língua Portuguesa", code: "POR-01", weight1: 1, weight2: 2, componentWeights: [2.5, 2.5, 2.5, 2.5] },
  { id: "d3", name: "História", code: "HIS-01", weight1: 1, weight2: 1, componentWeights: [2.5, 2.5, 2.5, 2.5] },
  { id: "d4", name: "Ciências", code: "CIE-01", weight1: 1, weight2: 1, componentWeights: [2.5, 2.5, 2.5, 2.5] },
];
const initialTeachers: Teacher[] = [
  { id: "t1", name: "Mariana Oliveira", email: "matematica@escola.com", password: "prof123", subjectIds: ["d1"] },
  { id: "t2", name: "Ricardo Santos", email: "portugues@escola.com", password: "prof123", subjectIds: ["d2"] },
];
const team = [
  { name: "Emanuel da Silva Correia", user: "emanueldasilvacorreia1413-debug" }, { name: "Iago Henrique Gomes Florêncio", user: "iagohenrique376-byte" },
  { name: "Lorena Maria", user: "lorena77z" }, { name: "Murillo Bordignon", user: "murillobordignon" }, { name: "Victória Bordignon", user: "victoriabordignon" },
];
const terms = ["1º trimestre", "2º trimestre", "3º trimestre"] as const;
const blankEntry = (): GradeEntry => ({ firstParts: [null, null, null, null], second: null });
const gradeKey = (studentId: string, subjectId: string, term: number) => `${studentId}:${subjectId}:T${term}`;
const initials = (name: string) => name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const formatDate = (value: string) => { const [year, month, day] = value.split("-"); return year && month && day ? `${day}/${month}/${year}` : value; };
const average = (values: (number | null)[]) => { const valid = values.filter((v): v is number => v !== null); return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null; };
function firstAverage(entry: GradeEntry, subject: Subject) {
  if (entry.firstParts.some((v) => v === null)) return null;
  return entry.firstParts.reduce<number>((sum, value, i) => sum + (value as number) * subject.componentWeights[i] / 10, 0);
}
function termAverage(entry: GradeEntry, subject: Subject) {
  const first = firstAverage(entry, subject);
  if (first === null || entry.second === null) return null;
  const total = subject.weight1 + subject.weight2;
  return total ? Math.min(10, Math.max(0, (first * subject.weight1 + entry.second * subject.weight2) / total)) : null;
}
function statusFor(value: number | null) {
  if (value === null) return { label: "Pendente", cls: "pending" };
  if (value < 6) return { label: "Reprovado", cls: "failed" };
  if (value < 7) return { label: "Recuperação", cls: "recovery" };
  return { label: "Aprovado", cls: "passed" };
}

// AES-GCM protects the localStorage payload against casual inspection/tampering.
// A client-only key is not a substitute for server-side security or authorization.
async function cryptoKey() {
  const material = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("NEXO-Escolar-local-protection-v3"));
  return crypto.subtle.importKey("raw", material, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptData(data: AppData) {
  const key = await cryptoKey(); const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(data)));
  return JSON.stringify({ version: 1, iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) });
}
async function decryptData(raw: string): Promise<AppData | null> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Array.isArray(parsed.iv) || !Array.isArray(parsed.data)) return null;
    const key = await cryptoKey(); const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(parsed.iv) }, key, new Uint8Array(parsed.data));
    const data = JSON.parse(new TextDecoder().decode(clear));
    return { students: data.students ?? initialStudents, subjects: data.subjects ?? initialSubjects, teachers: data.teachers ?? initialTeachers, grades: data.grades ?? {}, lessons: data.lessons ?? [], feedback: data.feedback ?? [], adminPhoto: data.adminPhoto ?? "" };
  } catch { return null; }
}

function getVideoEmbedUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
    let videoId = "";

    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (["youtube.com", "youtube-nocookie.com"].includes(host) || host.endsWith(".youtube.com") || host.endsWith(".youtube-nocookie.com")) {
      if (url.pathname === "/watch") videoId = url.searchParams.get("v") ?? "";
      else {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) videoId = parts[1] ?? "";
      }
    } else if (host === "vimeo.com" || host === "player.vimeo.com" || host.endsWith(".vimeo.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = parts.find((part) => /^\d+$/.test(part));
      if (!id) return "";
      return `https://player.vimeo.com/video/${id}`;
    } else {
      return "";
    }

    if (!/^[A-Za-z0-9_-]{6,}$/.test(videoId)) return "";
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return "";
  }
}

export default function Home() {
  const [data, setData] = useState<AppData>({ students: initialStudents, subjects: initialSubjects, teachers: initialTeachers, grades: {}, lessons: [], feedback: [] });
  const { students, subjects, teachers, grades, lessons, feedback } = data;
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [loginMode, setLoginMode] = useState<Role>("admin");
  const [activeTeacherId, setActiveTeacherId] = useState("");
  const [activeStudentId, setActiveStudentId] = useState("");
  const [activeView, setActiveView] = useState<View>("overview");
  const [term, setTerm] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentDialog, setStudentDialog] = useState<Student | null | "new">(null);
  const [teacherDialog, setTeacherDialog] = useState<Teacher | null | "new">(null);
  const [subjectDialog, setSubjectDialog] = useState<Subject | null | "new">(null);
  const [notice, setNotice] = useState("");
  const [loginError, setLoginError] = useState("");
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDraft, setVideoDraft] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonDate, setLessonDate] = useState("");
  const [lessonSubjectId, setLessonSubjectId] = useState("");
  const [lessonClass, setLessonClass] = useState("Desenvolvimento A");
  const [lessonGrade, setLessonGrade] = useState("2º");
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, boolean>>({});
  const [feedbackStudent, setFeedbackStudent] = useState("");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [adminStudentForReport, setAdminStudentForReport] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { const restored = await decryptData(raw); if (restored && mounted) setData(restored); }
      else {
        // Migra os dados da versão anterior e criptografa no próximo salvamento.
        const legacy = localStorage.getItem("nexo-escolar-v2") ?? localStorage.getItem("escola-online-v1");
        if (legacy) try {
          const parsed = JSON.parse(legacy);
          const migratedSubjects = (parsed.subjects ?? initialSubjects).map((s: Subject) => ({ ...s, componentWeights: s.componentWeights ?? [2.5, 2.5, 2.5, 2.5] }));
          const migratedGrades: GradeMap = {};
          Object.entries(parsed.grades ?? {}).forEach(([key, value]) => {
            const [studentId, subjectId] = key.split(":");
            const old = value as { first?: number | null; second?: number | null };
            migratedGrades[gradeKey(studentId, subjectId, 1)] = { firstParts: [old?.first ?? null, old?.first ?? null, old?.first ?? null, old?.first ?? null], second: old?.second ?? null };
          });
          if (mounted) { setData({ students: (parsed.students ?? initialStudents).map((s: Student) => ({ ...s, gradeLevel: s.gradeLevel ?? "2º", classGroup: s.classGroup ?? "Desenvolvimento A" })), subjects: migratedSubjects, teachers: parsed.teachers ?? initialTeachers, grades: migratedGrades, lessons: [], feedback: [] }); localStorage.removeItem("nexo-escolar-v2"); localStorage.removeItem("escola-online-v1"); }
        } catch { /* ignora dados legados inválidos */ }
      }
      if (mounted) { setDark(localStorage.getItem("nexo-theme") === "dark"); setVideoUrl(localStorage.getItem("nexo-team-video") ?? ""); setVideoDraft(localStorage.getItem("nexo-team-video") ?? ""); setReady(true); }
    })();
    return () => { mounted = false; };
  }, []);
  useEffect(() => { if (!ready) return; void encryptData(data).then((value) => localStorage.setItem(STORAGE_KEY, value)); }, [data, ready]);
  useEffect(() => { if (ready) { localStorage.setItem("nexo-theme", dark ? "dark" : "light"); localStorage.setItem("nexo-team-video", videoUrl); } }, [dark, ready, videoUrl]);

  const activeTeacher = teachers.find((t) => t.id === activeTeacherId);
  const activeStudent = students.find((s) => s.id === activeStudentId);
  const currentProfilePhoto = role === "student" ? activeStudent?.avatar ?? "" : role === "teacher" ? activeTeacher?.avatar ?? "" : data.adminPhoto ?? "";
  const teacherSubjects = subjects.filter((s) => activeTeacher?.subjectIds.includes(s.id));
  const visibleStudents = students;
  const filteredStudents = students.filter((s) => `${s.name} ${s.registration}`.toLowerCase().includes(search.toLowerCase()));
  const teacherPending = teacherSubjects.reduce((sum, subject) => sum + students.reduce((n, student) => { const entry = grades[gradeKey(student.id, subject.id, term)] ?? blankEntry(); return n + entry.firstParts.filter((v) => v === null).length + Number(entry.second === null); }, 0), 0);
  const overallAverage = average(students.flatMap((student) => subjects.flatMap((subject) => [1, 2, 3].map((t) => termAverage(grades[gradeKey(student.id, subject.id, t)] ?? blankEntry(), subject)))));

  function notify(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 3000); }
  function saveTeamVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role !== "admin") return;
    const value = videoDraft.trim();
    if (!value) {
      setVideoUrl("");
      notify("O vídeo da equipe foi removido.");
      return;
    }
    if (!getVideoEmbedUrl(value)) {
      notify("URL inválida. Informe um link válido do YouTube ou Vimeo.");
      return;
    }
    setVideoUrl(value);
    notify("Link do vídeo atualizado com sucesso.");
  }

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    if (loginMode === "admin") {
      if (form.get("email") === ADMIN_EMAIL && form.get("password") === ADMIN_PASSWORD) { setRole("admin"); setActiveView("overview"); setLoginError(""); return; }
      setLoginError("Confira o e-mail e a senha do administrador."); return;
    }
    if (loginMode === "teacher") {
      const email = String(form.get("teacherEmail") ?? "").trim().toLowerCase(); const password = String(form.get("teacherPassword") ?? "");
      const teacher = teachers.find((t) => t.email.toLowerCase() === email && t.password === password);
      if (!teacher) { setLoginError("E-mail ou senha do professor inválidos."); return; }
      setActiveTeacherId(teacher.id); setRole("teacher"); setLoginError(""); setLessonSubjectId(teacher.subjectIds[0] ?? ""); return;
    }
    const registration = String(form.get("registration") ?? "").trim(); const password = String(form.get("studentPassword") ?? "");
    const student = students.find((s) => s.registration === registration && s.password === password);
    if (!student) { setLoginError("Matrícula ou senha inválida."); return; }
    setActiveStudentId(student.id); setRole("student"); setLoginError("");
  }
  function saveGrade(studentId: string, subjectId: string, part: "second" | 0 | 1 | 2 | 3, value: string, selectedTerm = term) {
    if (!(role === "admin" || (role === "teacher" && activeTeacher?.subjectIds.includes(subjectId)))) return;
    const score = value === "" ? null : Number(value); if (score !== null && (!Number.isFinite(score) || score < 0 || score > 10)) return;
    const key = gradeKey(studentId, subjectId, selectedTerm);
    setData((d) => { const old = d.grades[key] ?? blankEntry(); const next = part === "second" ? { ...old, second: score } : { ...old, firstParts: old.firstParts.map((v, i) => i === part ? score : v) as GradeEntry["firstParts"] }; return { ...d, grades: { ...d.grades, [key]: next } }; });
  }
  function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const f = new FormData(event.currentTarget); const editing = studentDialog && studentDialog !== "new" ? studentDialog.id : "";
    const password = String(f.get("password") ?? "").trim(); const registration = String(f.get("registration") ?? "").trim();
    if (students.some((s) => s.registration === registration && s.id !== editing)) { notify("Matrícula já cadastrada."); return; }
    if (studentDialog === "new" && password.length < 6) { notify("A senha precisa ter pelo menos 6 caracteres."); return; }
    const base = { name: String(f.get("name")).trim(), registration, email: String(f.get("email")).trim(), gradeLevel: String(f.get("gradeLevel")) as Student["gradeLevel"], classGroup: String(f.get("classGroup")) as Student["classGroup"] };
    if (studentDialog === "new") setData((d) => ({ ...d, students: [...d.students, { id: crypto.randomUUID(), ...base, password }] }));
    else if (studentDialog) setData((d) => ({ ...d, students: d.students.map((s) => s.id === editing ? { ...s, ...base, password: password || s.password } : s) }));
    setStudentDialog(null); notify("Cadastro do aluno salvo.");
  }
  function saveTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const f = new FormData(event.currentTarget); const editing = teacherDialog && teacherDialog !== "new" ? teacherDialog.id : "";
    const subjectIds = f.getAll("subjectIds").map(String).filter((id) => subjects.some((s) => s.id === id)); const password = String(f.get("password") ?? "").trim();
    const base = { name: String(f.get("name")).trim(), email: String(f.get("email")).trim().toLowerCase(), subjectIds };
    if (teachers.some((t) => t.email.toLowerCase() === base.email && t.id !== editing)) { notify("E-mail já cadastrado."); return; }
    if (teacherDialog === "new" && password.length < 6) { notify("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (teacherDialog === "new") setData((d) => ({ ...d, teachers: [...d.teachers, { id: crypto.randomUUID(), ...base, password }] }));
    else if (teacherDialog) setData((d) => ({ ...d, teachers: d.teachers.map((t) => t.id === editing ? { ...t, ...base, password: password || t.password } : t) }));
    setTeacherDialog(null); notify("Professor salvo.");
  }
  function saveSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const f = new FormData(event.currentTarget); const weights = ["w1", "w2", "w3", "w4"].map((k) => Number(f.get(k))) as [number, number, number, number];
    if (weights.some((w) => w < 0 || w > 10) || Math.abs(weights.reduce((a, b) => a + b, 0) - 10) > 0.001) { notify("Os quatro pesos da 1ª nota devem somar exatamente 10."); return; }
    const base = { name: String(f.get("name")).trim(), code: String(f.get("code")).trim().toUpperCase(), weight1: Number(f.get("weight1")), weight2: Number(f.get("weight2")), componentWeights: weights };
    if (subjectDialog === "new") setData((d) => ({ ...d, subjects: [...d.subjects, { id: crypto.randomUUID(), ...base }] }));
    else if (subjectDialog) setData((d) => ({ ...d, subjects: d.subjects.map((s) => s.id === subjectDialog.id ? { ...s, ...base } : s) }));
    setSubjectDialog(null); notify("Disciplina salva.");
  }
  function saveComponentWeights(event: FormEvent<HTMLFormElement>, subjectId: string) {
    event.preventDefault();
    if (role !== "teacher" || !activeTeacher?.subjectIds.includes(subjectId)) return;
    const form = new FormData(event.currentTarget);
    const weights = ["a1", "a2", "a3", "a4"].map((key) => Number(form.get(key))) as [number, number, number, number];
    if (weights.some((w) => !Number.isFinite(w) || w < 0 || w > 10) || Math.abs(weights.reduce((a,b)=>a+b,0)-10) > 0.001) { notify("Os pesos de A1 a A4 precisam somar exatamente 10."); return; }
    setData((d) => ({ ...d, subjects: d.subjects.map((s) => s.id === subjectId ? { ...s, componentWeights: weights } : s) }));
    notify("Pesos das avaliações atualizados.");
  }
  function saveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeTeacher || !activeTeacher.subjectIds.includes(lessonSubjectId)) return;
    const studentsInClass = students.filter((s) => s.classGroup === lessonClass && s.gradeLevel === lessonGrade);
    const lesson: Lesson = { id: crypto.randomUUID(), teacherId: activeTeacher.id, subjectId: lessonSubjectId, date: lessonDate, term, classGroup: lessonClass, gradeLevel: lessonGrade, content: lessonContent.trim(), attendance: Object.fromEntries(studentsInClass.map((s) => [s.id, attendanceDraft[s.id] ?? false])) };
    setData((d) => ({ ...d, lessons: [lesson, ...d.lessons] })); setLessonContent(""); setAttendanceDraft({}); notify("Aula e frequência registradas.");
  }
  function saveFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeTeacher || !feedbackStudent || !feedbackSubject || !feedbackMessage.trim()) return;
    setData((d) => ({ ...d, feedback: [{ id: crypto.randomUUID(), teacherId: activeTeacher.id, studentId: feedbackStudent, subjectId: feedbackSubject, date: new Date().toISOString().slice(0, 10), message: feedbackMessage.trim() }, ...d.feedback] })); setFeedbackMessage(""); notify("Comentário enviado à administração.");
  }
  function changePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return; if (file.size > 700 * 1024) { notify("A imagem deve ter no máximo 700 KB."); return; }
    const reader = new FileReader(); reader.onload = () => { const image = String(reader.result); if (role === "admin") { setData((d) => ({ ...d, adminPhoto: image })); } else setData((d) => ({ ...d, students: d.students.map((s) => s.id === activeStudentId ? { ...s, avatar: image } : s), teachers: d.teachers.map((t) => t.id === activeTeacherId ? { ...t, avatar: image } : t) })); notify("Foto de perfil atualizada."); }; reader.readAsDataURL(file);
  }
  function printReport(student: Student) { setAdminStudentForReport(student.id); window.setTimeout(() => { window.print(); setAdminStudentForReport(""); }, 150); }
  function deleteStudent(student: Student) { if (!window.confirm(`Excluir ${student.name}?`)) return; setData((d) => ({ ...d, students: d.students.filter((s) => s.id !== student.id), grades: Object.fromEntries(Object.entries(d.grades).filter(([k]) => !k.startsWith(`${student.id}:`))), lessons: d.lessons.map((l) => ({ ...l, attendance: Object.fromEntries(Object.entries(l.attendance).filter(([id]) => id !== student.id)) })) })); }
  function deleteSubject(subject: Subject) { if (!window.confirm(`Excluir ${subject.name}?`)) return; setData((d) => ({ ...d, subjects: d.subjects.filter((s) => s.id !== subject.id), teachers: d.teachers.map((t) => ({ ...t, subjectIds: t.subjectIds.filter((id) => id !== subject.id) })), grades: Object.fromEntries(Object.entries(d.grades).filter(([k]) => !k.includes(`:${subject.id}:`))) })); }

  if (!ready) return <main className="loading-screen"><span className="brand-mark">N</span></main>;
  if (!role) return <main className="login-page"><section className="login-aside"><a className="brand-lockup" href="#inicio"><span className="brand-mark">N</span><span>NEXO<small>GESTÃO ACADÊMICA</small></span></a><div className="login-message"><p className="eyebrow">APRENDER, ACOMPANHAR, AVANÇAR</p><h1>O seu espaço<br/>para crescer.</h1><p>Uma escola mais próxima, organizada e conectada com cada etapa da jornada.</p></div><div className="aside-footer"><span>2 DSA</span><span>ANO LETIVO 2026</span></div></section><section className="login-content"><div className="login-card"><p className="eyebrow">BEM-VINDO(A) DE VOLTA</p><h2>Acesse sua conta</h2><p className="muted">Entre para acompanhar a vida acadêmica.</p><form onSubmit={signIn} className="login-form"><label className="field-label" htmlFor="role">Perfil de acesso</label><select id="role" value={loginMode} onChange={(e) => { setLoginMode(e.target.value as Role); setLoginError(""); }}><option value="admin">Administrador</option><option value="teacher">Professor</option><option value="student">Aluno</option></select>{loginMode === "admin" ? <><label className="field-label">E-mail</label><input name="email" type="email" placeholder={ADMIN_EMAIL} required/><label className="field-label">Senha</label><input name="password" type="password" placeholder="Senha do administrador" required/></> : loginMode === "teacher" ? <><label className="field-label">E-mail institucional</label><input name="teacherEmail" type="email" placeholder="professor@escola.com" required/><label className="field-label">Senha</label><input name="teacherPassword" type="password" required/></> : <><label className="field-label">Matrícula</label><input name="registration" required/><label className="field-label">Senha</label><input name="studentPassword" type="password" required/><p className="demo-hint">Acesso individual por matrícula e senha.</p></>}{loginError && <p className="form-error">{loginError}</p>}<button className="button button-primary login-submit">Entrar ↗</button></form><div className="login-bottom"><span>GESTÃO ACADÊMICA</span><a href="#equipe">2 DSA · 2026</a></div></div></section></main>;

  if (role === "student") {
    if (!activeStudent) return null;
    const studentSubjects = subjects.map((subject) => ({ subject, entries: [1, 2, 3].map((t) => grades[gradeKey(activeStudent.id, subject.id, t)] ?? blankEntry()) }));
    const annual = average(studentSubjects.flatMap(({ entries, subject }) => entries.map((entry) => termAverage(entry, subject))));
    return <main className={`student-page ${dark ? "theme-dark" : ""}`}><header className="student-header"><a className="brand-lockup"><span className="brand-mark">N</span><span>NEXO<small>GESTÃO ACADÊMICA</small></span></a><div className="profile-tools"><button className="button button-quiet" onClick={() => setDark(!dark)}>{dark ? "☀ Tema claro" : "☾ Tema escuro"}</button><label className="button button-quiet upload-label">Alterar foto<input type="file" accept="image/*" onChange={changePhoto} hidden/></label><button className="button button-quiet" onClick={() => setRole(null)}>Sair ↗</button></div></header><section className="report-wrap"><div className="report-topline"><p className="eyebrow">ÁREA DO ALUNO / BOLETIM</p><p className="term-label">{activeStudent.gradeLevel} ANO · {activeStudent.classGroup}</p></div><div className="report-heading"><div><p className="eyebrow">SEU DESEMPENHO ACADÊMICO</p><h1>Olá, {activeStudent.name.split(" ")[0]}.</h1><p className="muted">Consulte suas notas, médias e frequência nos três trimestres.</p></div>{currentProfilePhoto ? <img className="avatar avatar-large profile-image" src={currentProfilePhoto} alt="Foto de perfil"/> : <div className="avatar avatar-large">{initials(activeStudent.name)}</div>}</div><div className="report-summary"><div><span>MÉDIA ANUAL</span><strong>{annual === null ? "—" : annual.toFixed(1)}</strong><small>média das médias trimestrais</small></div><div><span>DISCIPLINAS</span><strong>{subjects.length.toString().padStart(2,"0")}</strong><small>na grade curricular</small></div><div><span>FREQUÊNCIA</span><strong>{(() => { const records = lessons.filter((l) => l.attendance[activeStudent.id] !== undefined); return records.length ? `${Math.round(records.filter((l) => l.attendance[activeStudent.id]).length / records.length * 100)}%` : "—"; })()}</strong><small>presença registrada</small></div></div><div className="print-only"><h1>Boletim escolar · NEXO</h1><p>{activeStudent.name} · Matrícula {activeStudent.registration} · {activeStudent.gradeLevel} ano · {activeStudent.classGroup}</p></div>{studentSubjects.map(({ subject, entries }) => <section className="report-section" key={subject.id}><div className="section-title"><div><p className="eyebrow">{subject.code}</p><h2>{subject.name}</h2></div></div><div className="table-scroll"><table><thead><tr><th>PERÍODO</th><th>1ª NOTA · A1</th><th>A2</th><th>A3</th><th>A4</th><th>2ª NOTA</th><th>MÉDIA</th><th>FREQUÊNCIA</th></tr></thead><tbody>{entries.map((entry, i) => { const avg = termAverage(entry, subject); const records = lessons.filter((l) => l.subjectId === subject.id && l.term === i + 1 && l.attendance[activeStudent.id] !== undefined); const pct = records.length ? `${Math.round(records.filter((l) => l.attendance[activeStudent.id]).length / records.length * 100)}%` : "—"; return <tr key={i}><td>{terms[i]}</td>{entry.firstParts.map((v, j) => <td className="grade-cell" key={j}>{v === null ? "—" : v.toFixed(1)}</td>)}<td className="grade-cell">{entry.second === null ? "—" : entry.second.toFixed(1)}</td><td className="grade-cell">{avg === null ? "—" : avg.toFixed(1)}</td><td>{pct}</td></tr>; })}</tbody></table></div></section>)}<div className="report-actions no-print"><button className="button button-primary" onClick={() => window.print()}>Imprimir / Salvar boletim em PDF</button></div><footer className="report-footer"><span>NEXO · GESTÃO ACADÊMICA</span><span>Em caso de dúvidas, procure a secretaria escolar.</span></footer></section></main>;
  }

  if (role === "teacher") {
    if (!activeTeacher) return null;
    const teacherLessons = lessons.filter((l) => l.teacherId === activeTeacher.id);
    return <main className={`student-page ${dark ? "theme-dark" : ""}`}><header className="student-header"><a className="brand-lockup"><span className="brand-mark">N</span><span>NEXO<small>GESTÃO ACADÊMICA</small></span></a><div className="profile-tools"><button className="button button-quiet" onClick={() => setDark(!dark)}>{dark ? "☀ Tema claro" : "☾ Tema escuro"}</button><label className="button button-quiet upload-label">Alterar foto<input type="file" accept="image/*" onChange={changePhoto} hidden/></label><button className="button button-quiet" onClick={() => setRole(null)}>Sair ↗</button></div></header><section className="report-wrap"><div className="report-topline"><p className="eyebrow">ÁREA DO PROFESSOR / PAINEL PEDAGÓGICO</p><p className="term-label">ANO LETIVO 2026</p></div><div className="report-heading"><div><p className="eyebrow">BEM-VINDO(A)</p><h1>Olá, {activeTeacher.name.split(" ")[0]}.</h1><p className="muted">Lance notas, registre suas aulas, frequência e observações pedagógicas.</p></div>{currentProfilePhoto ? <img className="avatar avatar-large profile-image" src={currentProfilePhoto} alt="Foto de perfil"/> : <div className="avatar avatar-large">{initials(activeTeacher.name)}</div>}</div><div className="report-summary teacher-summary"><div><span>MINHAS DISCIPLINAS</span><strong>{teacherSubjects.length.toString().padStart(2,"0")}</strong><small>vinculadas ao perfil</small></div><div><span>AVALIAÇÕES PENDENTES</span><strong>{teacherPending.toString().padStart(2,"0")}</strong><small>no trimestre selecionado</small></div><div><span>AULAS REGISTRADAS</span><strong>{teacherLessons.length.toString().padStart(2,"0")}</strong><small>por você</small></div></div><div className="term-switch"><label>Trimestre <select value={term} onChange={(e) => setTerm(Number(e.target.value))}>{terms.map((t,i)=><option value={i+1} key={t}>{t}</option>)}</select></label></div>{teacherSubjects.map((subject) => { const subjectPending = students.reduce((n, student) => { const entry = grades[gradeKey(student.id, subject.id, term)] ?? blankEntry(); return n + entry.firstParts.filter((v) => v === null).length + Number(entry.second === null); }, 0); return <section className="report-section" key={subject.id}><div className="section-title"><div><p className="eyebrow">{subject.code} · {terms[term-1].toUpperCase()}</p><h2>{subject.name}</h2></div><span className="registration-tag">{subjectPending} pendentes nesta disciplina</span></div><form className="weight-config" onSubmit={(e)=>saveComponentWeights(e,subject.id)}><strong>Pesos da 1ª nota · soma obrigatória: 10</strong><div>{subject.componentWeights.map((weight,i)=><label key={i}>A{i+1}<input name={`a${i+1}`} type="number" min="0" max="10" step="0.1" defaultValue={weight}/></label>)}</div><button className="button button-secondary" type="submit">Salvar pesos</button></form><div className="table-scroll"><table><thead><tr><th>ALUNO</th><th>1ª NOTA · A1</th><th>A2</th><th>A3</th><th>A4</th><th>2ª NOTA</th><th>MÉDIA</th></tr></thead><tbody>{students.map((student) => { const entry = grades[gradeKey(student.id, subject.id, term)] ?? blankEntry(); const avg = termAverage(entry, subject); return <tr key={student.id}><td className="subject-cell">{student.name}</td>{entry.firstParts.map((v,i)=><td className="grade-cell" key={i}><input className="grade-edit" aria-label={`Avaliação ${i+1} de ${student.name}`} type="number" min="0" max="10" step="0.1" value={v ?? ""} placeholder="—" onChange={(e)=>saveGrade(student.id,subject.id,i as 0 | 1 | 2 | 3,e.target.value)}/></td>)}<td className="grade-cell"><input className="grade-edit" type="number" min="0" max="10" step="0.1" value={entry.second ?? ""} placeholder="—" onChange={(e)=>saveGrade(student.id,subject.id,"second",e.target.value)}/></td><td className="grade-cell">{avg === null ? "—" : avg.toFixed(1)}</td></tr>; })}</tbody></table></div></section>; })}<section className="report-section"><div className="section-title"><div><p className="eyebrow">DIÁRIO DE CLASSE</p><h2>Registrar aula e frequência</h2></div></div><form className="dialog-form inline-form" onSubmit={saveLesson}><label className="field-label">Disciplina<select value={lessonSubjectId} onChange={(e)=>setLessonSubjectId(e.target.value)} required>{teacherSubjects.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><div className="form-two-columns"><label className="field-label">Data<input type="date" value={lessonDate} onChange={(e)=>setLessonDate(e.target.value)} required/></label><label className="field-label">Série<select value={lessonGrade} onChange={(e)=>setLessonGrade(e.target.value)}><option>1º</option><option>2º</option><option>3º</option></select></label></div><label className="field-label">Turma<select value={lessonClass} onChange={(e)=>setLessonClass(e.target.value)}><option>Desenvolvimento A</option><option>Desenvolvimento B</option></select></label><label className="field-label">Conteúdo ministrado<textarea value={lessonContent} onChange={(e)=>setLessonContent(e.target.value)} required placeholder="Descreva o conteúdo e as atividades da aula." rows={3}/></label><h3>Frequência dos alunos · marque quem esteve presente</h3><div className="attendance-list">{students.filter((s)=>s.gradeLevel===lessonGrade && s.classGroup===lessonClass).map((s)=><label key={s.id}><input type="checkbox" checked={attendanceDraft[s.id] ?? false} onChange={(e)=>setAttendanceDraft((d)=>({...d,[s.id]:e.target.checked}))}/>{s.name}</label>)}</div><button className="button button-primary" type="submit">Salvar aula e frequência</button></form></section><section className="report-section"><div className="section-title"><div><p className="eyebrow">ACOMPANHAMENTO INDIVIDUAL</p><h2>Feedback confidencial à administração</h2></div></div><form className="dialog-form inline-form" onSubmit={saveFeedback}><label className="field-label">Aluno<select value={feedbackStudent} onChange={(e)=>setFeedbackStudent(e.target.value)} required><option value="">Selecione</option>{students.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="field-label">Disciplina<select value={feedbackSubject} onChange={(e)=>setFeedbackSubject(e.target.value)} required><option value="">Selecione</option>{teacherSubjects.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="field-label">Comentário privado<textarea rows={3} value={feedbackMessage} onChange={(e)=>setFeedbackMessage(e.target.value)} placeholder="Registre observações pedagógicas para a administração." required/></label><button className="button button-primary">Enviar à administração</button></form></section><section className="report-section"><h2>Minhas aulas registradas</h2>{teacherLessons.map((l)=><article className="record-card" key={l.id}><strong>{formatDate(l.date)} · {subjects.find((s)=>s.id===l.subjectId)?.name}</strong><p>{l.gradeLevel} ano · {l.classGroup} · {terms[(l.term ?? 1)-1]}</p><p>{l.content}</p><small>{Object.values(l.attendance).filter(Boolean).length} presentes / {Object.keys(l.attendance).length} alunos</small></article>)}{!teacherLessons.length && <p className="muted">Você ainda não registrou aulas.</p>}</section><footer className="report-footer">NEXO · PAINEL DO PROFESSOR</footer></section></main>;
  }

  const nav: {id:View;label:string;icon:string}[] = [{id:"overview",label:"Visão geral",icon:"◫"},{id:"students",label:"Alunos",icon:"◉"},{id:"subjects",label:"Disciplinas",icon:"▤"},{id:"teachers",label:"Professores",icon:"♙"},{id:"lessons",label:"Registro de aulas",icon:"▣"},{id:"attendance",label:"Frequência",icon:"✓"},{id:"feedback",label:"Feedback privado",icon:"✉"},{id:"team",label:"Equipe",icon:"◇"}];
  return <main className={`admin-app ${dark ? "theme-dark" : ""}`}><aside className="sidebar"><a className="brand-lockup sidebar-brand"><span className="brand-mark">N</span><span>NEXO<small>GESTÃO ACADÊMICA</small></span></a><div className="sidebar-label">MENU PRINCIPAL</div><nav className="side-nav">{nav.map((n)=><button key={n.id} className={`nav-item ${activeView===n.id?"active":""}`} onClick={()=>setActiveView(n.id)}><span className="nav-icon">{n.icon}</span>{n.label}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-class"><span className="class-icon">N</span><div><strong>NEXO Escolar</strong><small>Ano letivo 2026</small></div></div><button className="logout-button" onClick={()=>setRole(null)}>↪ Sair da conta</button></div></aside><section className="admin-main"><header className="topbar"><div className="breadcrumb">Escola / {nav.find((n)=>n.id===activeView)?.label}</div><div className="topbar-user"><button className="button button-quiet" onClick={()=>setDark(!dark)}>{dark?"☀ Claro":"☾ Escuro"}</button><label className="button button-quiet upload-label">Foto<input type="file" accept="image/*" onChange={changePhoto} hidden/></label><span>Administrador</span>{data.adminPhoto?<img className="avatar profile-image" src={data.adminPhoto} alt="Foto do administrador"/>:<div className="avatar">AD</div>}</div></header><div className="workspace">
    {activeView === "overview" && <><div className="page-heading"><div><p className="eyebrow">GESTÃO INSTITUCIONAL</p><h1>Visão geral</h1><p className="muted">Indicadores institucionais do NEXO Escolar.</p></div><button className="button button-primary" onClick={()=>setStudentDialog("new")}>+ Novo aluno</button></div><div className="metrics-grid metrics-admin"><article className="metric-card metric-green"><div className="metric-top"><span>ALUNOS ATIVOS</span></div><strong>{students.length.toString().padStart(2,"0")}</strong><small>matriculados</small></article><article className="metric-card metric-yellow"><div className="metric-top"><span>DISCIPLINAS DISPONÍVEIS</span></div><strong>{subjects.length.toString().padStart(2,"0")}</strong><small>na instituição</small></article></div></>}
    {activeView === "students" && <><div className="page-heading"><div><p className="eyebrow">GESTÃO ACADÊMICA</p><h1>Alunos</h1><p className="muted">Cadastre estudantes, séries, turmas e imprima boletins.</p></div><button className="button button-primary" onClick={()=>setStudentDialog("new")}>+ Novo aluno</button></div><section className="panel full-panel"><div className="list-toolbar"><h2>{students.length} alunos</h2><label className="search-box"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar aluno"/></label></div><div className="table-scroll"><table><thead><tr><th>ALUNO</th><th>MATRÍCULA</th><th>SÉRIE</th><th>TURMA</th><th>BOLETIM / AÇÕES</th></tr></thead><tbody>{filteredStudents.map((s)=><tr key={s.id}><td className="subject-cell">{s.name}</td><td>{s.registration}</td><td>{s.gradeLevel} ano</td><td>{s.classGroup}</td><td><div className="row-actions"><button className="button button-secondary" onClick={()=>printReport(s)}>Imprimir PDF</button><button className="icon-button" onClick={()=>setStudentDialog(s)}>✎</button><button className="icon-button danger-action" onClick={()=>deleteStudent(s)}>×</button></div></td></tr>)}</tbody></table></div></section></>}
    {activeView === "subjects" && <><div className="page-heading"><div><p className="eyebrow">GRADE CURRICULAR</p><h1>Disciplinas</h1><p className="muted">Configure os pesos e as avaliações da primeira nota.</p></div><button className="button button-primary" onClick={()=>setSubjectDialog("new")}>+ Nova disciplina</button></div><section className="panel full-panel"><div className="table-scroll"><table><thead><tr><th>DISCIPLINA</th><th>CÓDIGO</th><th>PESOS A1–A4</th><th>AÇÕES</th></tr></thead><tbody>{subjects.map((s)=><tr key={s.id}><td className="subject-cell">{s.name}</td><td>{s.code}</td><td>{s.componentWeights.join(" / ")}</td><td><div className="row-actions"><button className="icon-button" onClick={()=>setSubjectDialog(s)}>✎</button><button className="icon-button danger-action" onClick={()=>deleteSubject(s)}>×</button></div></td></tr>)}</tbody></table></div></section></>}
    {activeView === "teachers" && <><div className="page-heading"><div><p className="eyebrow">GESTÃO DE ACESSOS</p><h1>Professores</h1><p className="muted">Verifique as disciplinas atribuídas e a realização dos registros de aula.</p></div><button className="button button-primary" onClick={()=>setTeacherDialog("new")}>+ Novo professor</button></div><section className="panel full-panel"><div className="table-scroll"><table><thead><tr><th>PROFESSOR</th><th>DISCIPLINAS</th><th>AULAS REGISTRADAS</th><th>ÚLTIMO REGISTRO</th><th>AÇÕES</th></tr></thead><tbody>{teachers.map((t)=>{const records=lessons.filter((l)=>l.teacherId===t.id);return <tr key={t.id}><td className="subject-cell">{t.name}</td><td>{subjects.filter((s)=>t.subjectIds.includes(s.id)).map((s)=>s.name).join(", ")||"Nenhuma"}</td><td>{records.length}</td><td>{records[0]?.date ? formatDate(records[0].date) : "Sem registro"}</td><td><button className="icon-button" onClick={()=>setTeacherDialog(t)}>✎</button></td></tr>;})}</tbody></table></div></section></>}
    {activeView === "lessons" && <><div className="page-heading"><div><p className="eyebrow">ACOMPANHAMENTO DOCENTE</p><h1>Registros de aula</h1><p className="muted">Consulte se os professores registraram suas aulas.</p></div></div><section className="panel full-panel">{lessons.map((l)=><article className="record-card" key={l.id}><strong>{teachers.find((t)=>t.id===l.teacherId)?.name} · {subjects.find((s)=>s.id===l.subjectId)?.name}</strong><p>{formatDate(l.date)} · {l.gradeLevel} ano · {l.classGroup} · {terms[(l.term ?? 1)-1]}</p><p>{l.content}</p><small>{Object.values(l.attendance).filter(Boolean).length} presentes de {Object.keys(l.attendance).length} alunos</small></article>)}{!lessons.length&&<p className="muted">Nenhuma aula registrada até o momento.</p>}</section></>}
    {activeView === "attendance" && <><div className="page-heading"><div><p className="eyebrow">CONTROLE DE PRESENÇA</p><h1>Frequência dos alunos</h1><p className="muted">Acompanhamento das presenças registradas pelos professores.</p></div></div><section className="panel full-panel"><div className="table-scroll"><table><thead><tr><th>ALUNO</th><th>SÉRIE / TURMA</th><th>AULAS REGISTRADAS</th><th>PRESENÇAS</th><th>FALTAS</th><th>FREQUÊNCIA</th></tr></thead><tbody>{students.map((s)=>{const records=lessons.filter((l)=>l.attendance[s.id]!==undefined);const present=records.filter((l)=>l.attendance[s.id]).length;return <tr key={s.id}><td className="subject-cell">{s.name}</td><td>{s.gradeLevel} · {s.classGroup}</td><td>{records.length}</td><td>{present}</td><td>{records.length-present}</td><td>{records.length?`${Math.round(present/records.length*100)}%`:"—"}</td></tr>;})}</tbody></table></div></section></>}
    {activeView === "feedback" && <><div className="page-heading"><div><p className="eyebrow">ACESSO RESTRITO À ADMINISTRAÇÃO</p><h1>Feedback pedagógico</h1><p className="muted">Comentários enviados pelos professores. Esta área não é exibida aos alunos.</p></div></div><section className="panel full-panel">{feedback.map((f)=><article className="record-card" key={f.id}><strong>{students.find((s)=>s.id===f.studentId)?.name} · {subjects.find((s)=>s.id===f.subjectId)?.name}</strong><p>Professor: {teachers.find((t)=>t.id===f.teacherId)?.name} · {formatDate(f.date)}</p><p>{f.message}</p></article>)}{!feedback.length&&<p className="muted">Nenhum feedback recebido.</p>}</section></>}
    {activeView === "team" && <><div className="page-heading"><div><p className="eyebrow">QUEM FAZ ACONTECER</p><h1>Nossa equipe</h1><p className="muted">As pessoas por trás do NEXO Escolar.</p></div><span className="team-count">2 DSA · 05 integrantes</span></div><section className="team-list">{team.map((m,i)=><article className="team-member" key={m.user}><span className="team-number">0{i+1}</span><span className="team-avatar">{initials(m.name)}</span><div className="team-person"><h2>{m.name}</h2><p>Desenvolvimento · Turma 2 DSA</p></div><a className="github-link" href={`https://github.com/${m.user}`} target="_blank" rel="noreferrer">@{m.user} ↗</a></article>)}</section><section className="panel video-panel"><p className="eyebrow">APRESENTAÇÃO INSTITUCIONAL</p><h2>Conheça nossa equipe em vídeo</h2><p className="muted">O espaço está preparado para receber o vídeo que será gravado pela equipe.</p>{videoUrl && getVideoEmbedUrl(videoUrl) ? <div className="video-frame"><iframe src={getVideoEmbedUrl(videoUrl)} title="Vídeo de apresentação da equipe" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/></div> : <div className="video-placeholder"><span>▶</span><strong>{videoUrl ? "Não foi possível carregar este vídeo" : "Vídeo da equipe em breve"}</strong><small>{videoUrl ? "Verifique se o vídeo está público ou permite incorporação." : "O administrador poderá adicionar o link quando a gravação estiver pronta."}</small></div>}{role === "admin" && <form className="video-link-form" onSubmit={saveTeamVideo}><label className="field-label">Link do vídeo (YouTube/Vimeo)<input value={videoDraft} onChange={(e)=>setVideoDraft(e.target.value)} placeholder="https://www.youtube.com/watch?v=..."/></label><div className="dialog-actions"><button type="submit" className="button button-primary">Salvar vídeo</button></div></form>}</section></>}
    <footer className="app-footer">NEXO · GESTÃO ACADÊMICA · 2 DSA</footer></div></section>
    {notice&&<div className="toast" role="status">{notice}</div>}
    {studentDialog!==null&&<div className="dialog-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setStudentDialog(null);}}><section className="dialog" role="dialog" aria-modal="true"><div className="dialog-heading"><div><p className="eyebrow">GESTÃO DE ALUNOS</p><h2>{studentDialog==="new"?"Novo aluno":"Editar aluno"}</h2></div><button className="dialog-close" onClick={()=>setStudentDialog(null)}>×</button></div><form className="dialog-form" onSubmit={saveStudent}><label className="field-label">Nome completo<input name="name" required defaultValue={studentDialog==="new"?"":studentDialog.name}/></label><label className="field-label">Matrícula<input name="registration" required defaultValue={studentDialog==="new"?"":studentDialog.registration}/></label><label className="field-label">E-mail<input name="email" type="email" required defaultValue={studentDialog==="new"?"":studentDialog.email}/></label><div className="form-two-columns"><label className="field-label">Série<select name="gradeLevel" defaultValue={studentDialog==="new"?"1º":studentDialog.gradeLevel}><option>1º</option><option>2º</option><option>3º</option></select></label><label className="field-label">Turma<select name="classGroup" defaultValue={studentDialog==="new"?"Desenvolvimento A":studentDialog.classGroup}><option>Desenvolvimento A</option><option>Desenvolvimento B</option></select></label></div><label className="field-label">{studentDialog==="new"?"Senha inicial":"Nova senha (opcional)"}<input name="password" type="password" minLength={6} required={studentDialog==="new"}/></label><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={()=>setStudentDialog(null)}>Cancelar</button><button className="button button-primary">Salvar aluno</button></div></form></section></div>}
    {teacherDialog!==null&&<div className="dialog-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setTeacherDialog(null);}}><section className="dialog" role="dialog" aria-modal="true"><div className="dialog-heading"><div><p className="eyebrow">GESTÃO DE PROFESSORES</p><h2>{teacherDialog==="new"?"Novo professor":"Editar professor"}</h2></div><button className="dialog-close" onClick={()=>setTeacherDialog(null)}>×</button></div><form className="dialog-form" onSubmit={saveTeacher}><label className="field-label">Nome<input name="name" required defaultValue={teacherDialog==="new"?"":teacherDialog.name}/></label><label className="field-label">E-mail<input name="email" type="email" required defaultValue={teacherDialog==="new"?"":teacherDialog.email}/></label><label className="field-label">Senha<input name="password" type="password" minLength={6} required={teacherDialog==="new"}/></label><strong>Disciplinas vinculadas</strong><div className="teacher-subject-options">{subjects.map((s)=><label key={s.id}><input type="checkbox" name="subjectIds" value={s.id} defaultChecked={teacherDialog!=="new"&&teacherDialog.subjectIds.includes(s.id)}/>{s.name}</label>)}</div><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={()=>setTeacherDialog(null)}>Cancelar</button><button className="button button-primary">Salvar professor</button></div></form></section></div>}
    {subjectDialog!==null&&<div className="dialog-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setSubjectDialog(null);}}><section className="dialog" role="dialog" aria-modal="true"><div className="dialog-heading"><div><p className="eyebrow">GRADE CURRICULAR</p><h2>{subjectDialog==="new"?"Nova disciplina":"Editar disciplina"}</h2></div><button className="dialog-close" onClick={()=>setSubjectDialog(null)}>×</button></div><form className="dialog-form" onSubmit={saveSubject}><label className="field-label">Disciplina<input name="name" required defaultValue={subjectDialog==="new"?"":subjectDialog.name}/></label><label className="field-label">Código<input name="code" required defaultValue={subjectDialog==="new"?"":subjectDialog.code}/></label><p className="muted">Pesos da 1ª nota (A1 + A2 + A3 + A4 = 10)</p><div className="form-two-columns">{(["w1","w2","w3","w4"] as const).map((k,i)=><label className="field-label" key={k}>Avaliação {i+1}<input name={k} type="number" min="0" max="10" step="0.1" required defaultValue={subjectDialog==="new"?2.5:subjectDialog.componentWeights[i]}/></label>)}</div><div className="form-two-columns"><label className="field-label">Peso da 1ª nota<input name="weight1" type="number" min="0.1" step="0.1" defaultValue={subjectDialog==="new"?1:subjectDialog.weight1}/></label><label className="field-label">Peso da 2ª nota<input name="weight2" type="number" min="0.1" step="0.1" defaultValue={subjectDialog==="new"?1:subjectDialog.weight2}/></label></div><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={()=>setSubjectDialog(null)}>Cancelar</button><button className="button button-primary">Salvar disciplina</button></div></form></section></div>}
    {adminStudentForReport&&<div className="print-only report-print"><h1>NEXO Escolar · Boletim</h1><p>{students.find((s)=>s.id===adminStudentForReport)?.name} · Matrícula {students.find((s)=>s.id===adminStudentForReport)?.registration} · {students.find((s)=>s.id===adminStudentForReport)?.gradeLevel} ano · {students.find((s)=>s.id===adminStudentForReport)?.classGroup}</p><table><thead><tr><th>Disciplina</th><th>1º trimestre · A1/A2/A3/A4 · 2ª nota · média</th><th>2º trimestre · A1/A2/A3/A4 · 2ª nota · média</th><th>3º trimestre · A1/A2/A3/A4 · 2ª nota · média</th><th>Frequência</th></tr></thead><tbody>{subjects.map((s)=><tr key={s.id}><td>{s.name}</td>{[1,2,3].map((t)=>{const entry=grades[gradeKey(adminStudentForReport,s.id,t)]??blankEntry();return <td key={t}>{entry.firstParts.map((v)=>v===null?"—":v.toFixed(1)).join(" / ")} · {entry.second===null?"—":entry.second.toFixed(1)} · Média: {termAverage(entry,s)?.toFixed(1)??"—"}</td>;})}<td>{(()=>{const r=lessons.filter((l)=>l.subjectId===s.id&&l.attendance[adminStudentForReport]!==undefined);return r.length?`${Math.round(r.filter((l)=>l.attendance[adminStudentForReport]).length/r.length*100)}%`:"—";})()}</td></tr>)}</tbody></table><div className="signature-row"><div>________________________________<br/>Coordenador(a) Pedagógico(a)</div><div>________________________________<br/>Assistente de Gestão</div></div></div>}
  </main>;
}
