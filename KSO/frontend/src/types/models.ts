export type Role =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "COLLEGE_ADMIN"
  | "HIGH_SCHOOL_ADMIN"
  | "UNIVERSITY_ADMIN"
  | "TEACHER"
  | "STUDENT"
  | "UNIVERSITY_STUDENT"
  | "PARENT";

export type Semester = "SEMESTER_1" | "SEMESTER_2";
export type Sequence = "SEQUENCE_1" | "SEQUENCE_2" | "SEQUENCE_3";

export type StudentLevel =
  | "SECONDE"
  | "PREMIERE"
  | "TERMINALE"
  | "LOWER_SIXTH"
  | "UPPER_SIXTH"
  | "LICENCE_1"
  | "LICENCE_2"
  | "LICENCE_3"
  | "MASTER_1"
  | "MASTER_2"
  | "AUTRE";

export type Stream = "SCIENTIFIQUE" | "LITTERAIRE" | "ECONOMIQUE" | "TECHNIQUE" | "INGENIERIE" | "MEDECINE" | "ECONOMIE_GESTION" | "LANGUE" | "DROIT" | "AUTRE";

export type SchoolType = "COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY";

export type StudentProfileType = "ELEVE" | "ETUDIANT";

export type RiskLevel = "FAIBLE" | "MOYEN" | "ELEVE";
export type PlanStatus = "A_FAIRE" | "EN_COURS" | "TERMINE";
export type AlertSeverity = "INFO" | "ATTENTION" | "CRITIQUE";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  schoolId: string | null;
  school?: {
    id: string;
    name: string;
    code: string;
    type?: "COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY";
  } | null;
  student?: {
    id: string;
    registrationNumber: string;
    classId: string | null;
    profileType?: StudentProfileType;
  } | null;
  teacher?: {
    id: string;
    employeeCode: string;
  } | null;
}

export interface School {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  type: "COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY";
  isActive: boolean;
  _count?: {
    students: number;
    teachers: number;
    classes: number;
    users: number;
  };
}

export interface ClassItem {
  id: string;
  name: string;
  room?: string | null;
  level: string;
  stream: string;
  academicYear: string;
  _count?: {
    students: number;
    assignments: number;
  };
}

export interface Subject {
  id: string;
  name: string;
  coefficient: number;
  isCore: boolean;
}

export interface Student {
  id: string;
  registrationNumber: string;
  fullName: string;
  profileType: StudentProfileType;
  level: string;
  stream: string;
  schoolId: string;
  classId?: string | null;
  dreamCareer?: string | null;
  targetProfession?: string | null;
  learningObjectives?: string | null;
  class?: {
    id: string;
    name: string;
    room?: string | null;
  } | null;
  preferredSubject?: {
    id: string;
    name: string;
  } | null;
  orientation?: {
    riskLevel: RiskLevel;
    riskScore: number;
  } | null;
}

export interface Grade {
  id: string;
  score: number;
  maxScore: number;
  semester: Semester;
  sequence: Sequence;
  recordedAt: string;
  comment?: string | null;
  student: {
    id: string;
    fullName: string;
    registrationNumber: string;
  };
  subject: {
    id: string;
    name: string;
    coefficient: number;
  };
  class: {
    id: string;
    name: string;
    room?: string | null;
  };
  teacher: {
    id: string;
    fullName: string;
  };
}

export interface StudentPlan {
  id: string;
  title: string;
  description: string | null;
  status: PlanStatus;
  quarter?: "Q1" | "Q2" | "Q3" | "Q4" | null;
  progressPercent?: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  tasks?: PlanTask[];
  collaborators?: PlanCollaborator[];
}

export interface PlanTask {
  id: string;
  title: string;
  description: string | null;
  status: PlanStatus;
  dueDate: string | null;
  completedAt: string | null;
  assignedToUserId: string | null;
}

export interface PlanCollaborator {
  id: string;
  roleLabel: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    role: Role;
  };
}

export interface StudentAlert {
  id: string;
  severity: AlertSeverity;
  category: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface SchoolAnalytics {
  schoolId: string;
  summary: {
    successRate: number;
    excellentRate: number;
    averageScore: number;
    progression: number;
  };
  classCount: number;
  totalStudents: number;
  classPerformance: Array<{
    classId: string;
    className: string;
    room: string | null;
    average: number;
  }>;
  subjectStats: Array<{
    subjectName: string;
    average: number;
  }>;
  riskDistribution: {
    faible: number;
    moyen: number;
    eleve: number;
  };
  alertSummary: {
    totalOpen: number;
    critical: number;
    attention: number;
  };
}

export interface StudentAnalytics {
  student: {
    id: string;
    fullName: string;
    registrationNumber: string;
    dreamCareer?: string | null;
    targetProfession?: string | null;
    class?: {
      id: string;
      name: string;
      room?: string | null;
    } | null;
    preferredSubject?: {
      id: string;
      name: string;
    } | null;
  };
  metrics: {
    currentAverage: number;
    bestAverage: number;
    currentRank: number | null;
    preferredSubject?: {
      id: string;
      name: string;
    } | null;
    dreamCareer?: string | null;
    targetProfession?: string | null;
    risk: OrientationProfile;
  };
  progression: Array<{
    semester: Semester;
    average: number;
    rank: number;
    trend: number | null;
  }>;
  subjectAverages: Array<{
    subjectName: string;
    average: number;
  }>;
  sequenceAverages: Array<{
    semester: Semester;
    sequence: Sequence;
    average: number;
  }>;
  alerts: StudentAlert[];
  plans: StudentPlan[];
}

export interface ClassAnalytics {
  class: {
    id: string;
    name: string;
    room?: string | null;
  };
  semester: Semester;
  ranking: Array<{
    student: {
      id: string;
      fullName: string;
      registrationNumber: string;
    };
    weightedAverage: number;
    rank: number;
    status: string;
  }>;
  subjectStats: Array<{
    subjectName: string;
    average: number;
  }>;
  sequenceStats: Array<{
    sequence: Sequence;
    average: number;
  }>;
  weakestSubject: {
    subjectName: string;
    average: number;
  } | null;
  riskDistribution: {
    faible: number;
    moyen: number;
    eleve: number;
  };
  evolutionByStudent: Array<{
    studentId: string;
    fullName: string;
    points: Array<{ semester: Semester; average: number }>;
  }>;
}

export interface TeacherEvolution {
  teacher: {
    id: string;
    fullName: string;
    employeeCode: string;
  };
  semester: Semester | null;
  assignments: Array<{
    assignmentId: string;
    classId: string;
    className: string;
    room: string | null;
    subjectId: string;
    subjectName: string;
    students: Array<{
      studentId: string;
      fullName: string;
      registrationNumber: string;
      semesterAverage: number;
      sequenceAverages: Array<{
        sequence: Sequence;
        average: number;
      }>;
    }>;
  }>;
}

export interface OrientationProfile {
  id: string;
  studentId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  recommendedStream: string | null;
  recommendedCareers: string[];
  insights: string | null;
  explanation?: unknown;
  student?: {
    id: string;
    fullName: string;
    registrationNumber: string;
    dreamCareer?: string | null;
    targetProfession?: string | null;
    class?: {
      id: string;
      name: string;
      room?: string | null;
    } | null;
  };
}

export interface AccompanimentOverview {
  student: Student;
  metrics: {
    semesterAverage: number;
    rank: number | null;
    preferredSubject?: {
      id: string;
      name: string;
    } | null;
    dreamCareer?: string | null;
    targetProfession?: string | null;
    learningObjectives?: string | null;
    orientation?: OrientationProfile | null;
  };
  subjectAverages: Array<{
    subjectName: string;
    average: number;
  }>;
  sequentialAverages: Array<{
    semester: string;
    sequence: string;
    average: number;
  }>;
  progression: Array<{
    semester: Semester;
    weightedAverage: number;
    rank: number;
    trend: number | null;
  }>;
  plans: StudentPlan[];
  alerts: StudentAlert[];
}

export interface LoginResponse {
  accessToken?: string;
  token: string;
  user: AuthUser;
}

export interface RemediationItem {
  subjectName: string;
  isCore: boolean;
  average: number;
  recommendation: string;
}

export interface GuidanceHub {
  student: Student;
  indicators: {
    attendanceSummary: {
      present: number;
      absent: number;
      late: number;
    };
    incidentsCount: number;
    openAlerts: number;
    wellbeing: {
      mood: number;
      stress: number;
      energy: number;
      comment?: string | null;
      createdAt: string;
    } | null;
  };
  plans: StudentPlan[];
  alerts: StudentAlert[];
  competencies: Array<{
    id: string;
    category: string;
    label: string;
    score: number;
    comment: string | null;
    assessedAt: string;
  }>;
  attendance: Array<{
    id: string;
    date: string;
    status: "PRESENT" | "ABSENT" | "RETARD";
    note: string | null;
  }>;
  incidents: Array<{
    id: string;
    category: string;
    severity: AlertSeverity;
    description: string;
    occurredAt: string;
  }>;
  remediation: RemediationItem[];
  opportunities: Array<{
    id: string;
    matchScore: number;
    rationale: string | null;
    opportunity: {
      id: string;
      title: string;
      type: string;
      deadline: string | null;
      location: string | null;
    };
  }>;
  internships: Array<{
    id: string;
    type: "STAGE" | "ALTERNANCE";
    title: string;
    organization: string;
    status: "EN_COURS" | "PRESELECTIONNE" | "ACCEPTE" | "REFUSE";
    notes: string | null;
    updatedAt: string;
  }>;
  mentorship: Array<{
    id: string;
    mentorName: string;
    topic: string;
    scheduledAt: string;
    status: "PLANIFIEE" | "TERMINEE" | "ANNULEE";
  }>;
  journal: Array<{
    id: string;
    weekStart: string;
    summary: string;
    tips: string | null;
  }>;
  portfolio: Array<{
    id: string;
    title: string;
    category: "PROJET" | "CERTIFICATION" | "ACTIVITE" | "DISTINCTION";
    description: string | null;
    url: string | null;
  }>;
  wellbeing: Array<{
    id: string;
    mood: number;
    stress: number;
    energy: number;
    comment: string | null;
    createdAt: string;
  }>;
  badges: Array<{
    id: string;
    badgeType: string;
    title: string;
    points: number;
    awardedAt: string;
  }>;
  weeklyTips: string[];
}

export interface StudentProjection {
  studentId: string;
  semester: Semester;
  simulatedSubject: {
    id: string;
    name: string;
  };
  projection: {
    currentAverage: number;
    projectedAverage: number;
    deltaAverage: number;
    currentRank: number | null;
    projectedRank: number;
    projectedStatus: string;
    projectedRiskScore: number;
    projectedRiskLevel: RiskLevel;
  };
}

export interface DiscussionGroup {
  id: string;
  uniqueKey: string;
  name: string;
  profileType: StudentProfileType;
  level: string;
  stream: string;
  academicYear: string;
  _count: {
    messages: number;
  };
  messages: DiscussionMessage[];
}

export interface DiscussionMessage {
  id: string;
  groupId?: string;
  content: string;
  createdAt: string;
  senderUser: {
    id: string;
    fullName: string;
    role?: Role;
    school?: {
      id: string;
      name: string;
      code: string;
    } | null;
  };
}

export interface ChatEmoji {
  shortcode: string;
  emoji: string;
  label: string;
}

export interface ChatUploadResult {
  fileName: string;
  originalName: string;
  key?: string;
  mimeType: string;
  size: number;
  url: string;
  messageTemplate: string;
}

export interface EstablishmentCard {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  type: "COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY";
  isActive: boolean;
  counts: {
    students: number;
    teachers: number;
    classes: number;
  };
  averageReadiness: number;
  topStudent: {
    fullName: string;
    readinessScore: number;
  } | null;
}

export interface StudentReadiness {
  studentId: string;
  fullName: string;
  registrationNumber: string;
  level: string;
  stream: string;
  profileType: StudentProfileType;
  class: {
    id: string;
    name: string;
    room?: string | null;
  } | null;
  school: {
    id: string;
    name: string;
    code: string;
    type: "COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY";
  };
  dreamCareer: string | null;
  targetProfession: string | null;
  latestAverage: number;
  trend: number;
  riskLevel: RiskLevel;
  riskScore: number;
  planProgress: number;
  readinessScore: number;
  readinessBucket: "TRES_PROCHE" | "EN_BONNE_VOIE" | "A_ACCOMPAGNER" | "CRITIQUE";
  gapToTarget: number;
}

export interface EstablishmentDetails {
  school: {
    id: string;
    name: string;
    code: string;
    city: string;
    type: "COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY";
    isActive: boolean;
  };
  counts: {
    students: number;
    classes: number;
  };
  studentsByLevel: Array<{
    level: string;
    count: number;
  }>;
  studentsByClass: Array<{
    classId: string;
    className: string;
    room: string | null;
    level: string;
    stream: string;
    academicYear: string;
    studentsCount: number;
  }>;
  readinessRanking: {
    page: number;
    pageSize: number;
    total: number;
    items: StudentReadiness[];
  };
}

export interface StudentImportResult {
  createdCount: number;
  errorCount: number;
  errors: Array<{ row: number; message: string }>;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  startsAt: string | null;
  endsAt: string | null;
  isPublished: boolean;
  targetSchoolId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  targetSchool?: {
    id: string;
    name: string;
    code: string;
    type: "COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY";
  } | null;
  createdByUser?: {
    id: string;
    fullName: string;
  } | null;
}

export interface AnnouncementPage {
  page: number;
  pageSize: number;
  total: number;
  items: Announcement[];
}

export interface DreamProgressReport {
  summary: {
    totalStudents: number;
    averageReadiness: number;
    veryClose: number;
    inGoodTrack: number;
    toSupport: number;
    critical: number;
  };
  ranking: {
    page: number;
    pageSize: number;
    total: number;
    items: StudentReadiness[];
  };
}

export interface SuperAdminDashboardAnalytics {
  summary: {
    totalStudents: number;
    totalTeachers: number;
    studentsWithAverage: number;
    studentsWithoutAverage: number;
  };
  semesterAverages: Array<{
    semester: Semester;
    average: number;
    students: number;
  }>;
  disciplineAverages: Array<{
    subjectName: string;
    average: number;
    gradesCount: number;
  }>;
  scoreDistribution: Array<{
    label: string;
    min: number;
    max: number;
    count: number;
  }>;
}
