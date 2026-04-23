import { api } from "./client";
import {
  AccompanimentOverview,
  AnnouncementPage,
  ChatEmoji,
  ChatUploadResult,
  ClassAnalytics,
  ClassItem,
  DreamProgressReport,
  DiscussionGroup,
  DiscussionMessage,
  EstablishmentCard,
  EstablishmentDetails,
  GuidanceHub,
  Grade,
  LoginResponse,
  OrientationProfile,
  RemediationItem,
  Role,
  School,
  SchoolAnalytics,
  SchoolType,
  Stream,
  Student,
  StudentAlert,
  StudentAnalytics,
  StudentImportResult,
  StudentLevel,
  StudentPlan,
  StudentProfileType,
  StudentProjection,
  Subject,
  SuperAdminDashboardAnalytics,
  TeacherEvolution
} from "../types/models";

export const authApi = {
  login: async (payload: { email: string; password: string }) => {
    const { data } = await api.post<LoginResponse>("/auth/login", payload);
    return data;
  },

  register: async (payload: {
    email: string;
    password: string;
    fullName: string;
    role: Role;
    schoolId?: string;
    // Champs pour les étudiants
    registrationNumber?: string;
    dateOfBirth?: string;
    profileType?: StudentProfileType;
    level?: StudentLevel;
    stream?: Stream;
    guardianPhone?: string;
    dreamCareer?: string;
    targetProfession?: string;
    learningObjectives?: string;
    admissionYear?: number;
    // Champs pour les enseignants
    employeeCode?: string;
    speciality?: string;
    // Champs pour créer un établissement (admins)
    schoolName?: string;
    schoolCode?: string;
    schoolCity?: string;
    schoolCountry?: string;
    schoolType?: SchoolType;
  }) => {
    const { data } = await api.post<LoginResponse>("/auth/register", payload);
    return data;
  },

  refresh: async () => {
    const { data } = await api.post<LoginResponse>("/auth/refresh");
    return data;
  },

  logout: async () => {
    await api.post("/auth/logout");
  },

  forgotPassword: async (email: string) => {
    const { data } = await api.post<{ message: string }>("/auth/forgot-password", { email });
    return data;
  },

  resetPassword: async (token: string, password: string) => {
    const { data } = await api.post<{ message: string }>("/auth/reset-password", { token, password });
    return data;
  },

  me: async () => {
    const { data } = await api.get("/auth/me");
    return data;
  }
};

export const schoolApi = {
  list: async () => {
    const { data } = await api.get<School[]>("/schools");
    return data;
  },

  create: async (payload: {
    name: string;
    code: string;
    city: string;
    country?: string;
    type?: "COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY";
    admin?: {
      fullName: string;
      email: string;
      password: string;
    };
  }) => {
    const { data } = await api.post<School>("/schools", payload);
    return data;
  },

  getById: async (schoolId: string) => {
    const { data } = await api.get<School>(`/schools/${schoolId}`);
    return data;
  }
};

export const academicApi = {
  listClasses: async (schoolId?: string) => {
    const { data } = await api.get<ClassItem[]>("/academic/classes", {
      params: schoolId ? { schoolId } : undefined
    });

    return data;
  },

  listSubjects: async (schoolId?: string) => {
    const { data } = await api.get<Subject[]>("/academic/subjects", {
      params: schoolId ? { schoolId } : undefined
    });

    return data;
  },

  listTeachers: async (schoolId?: string) => {
    const { data } = await api.get<Array<{ id: string; fullName: string; employeeCode: string }>>("/academic/teachers", {
      params: schoolId ? { schoolId } : undefined
    });

    return data;
  }
};

export const studentApi = {
  list: async (params?: Record<string, string>) => {
    const { data } = await api.get<Student[]>("/students", { params });
    return data;
  },

  getById: async (studentId: string) => {
    const { data } = await api.get<Student>(`/students/${studentId}`);
    return data;
  },

  create: async (payload: {
    schoolId?: string;
    classId?: string;
    preferredSubjectId?: string;
    registrationNumber: string;
    fullName: string;
    profileType?: "ELEVE" | "ETUDIANT";
    level:
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
    stream: "SCIENTIFIQUE" | "LITTERAIRE" | "ECONOMIQUE" | "TECHNIQUE" | "AUTRE";
    guardianPhone?: string;
    dreamCareer?: string;
    targetProfession?: string;
    learningObjectives?: string;
    admissionYear?: number;
  }) => {
    const { data } = await api.post<Student>("/students", payload);
    return data;
  },

  update: async (
    studentId: string,
    payload: Partial<{
      classId?: string;
      preferredSubjectId?: string;
      profileType?: "ELEVE" | "ETUDIANT";
      level:
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
      stream: "SCIENTIFIQUE" | "LITTERAIRE" | "ECONOMIQUE" | "TECHNIQUE" | "AUTRE";
      dreamCareer?: string;
      targetProfession?: string;
      learningObjectives?: string;
    }>
  ) => {
    const { data } = await api.patch<Student>(`/students/${studentId}`, payload);
    return data;
  }
};

export const gradeApi = {
  list: async (params?: Record<string, string>) => {
    const { data } = await api.get<Grade[]>("/grades", { params });
    return data;
  },

  create: async (payload: {
    schoolId?: string;
    studentId: string;
    classId: string;
    subjectId: string;
    teacherId?: string;
    semester: "SEMESTER_1" | "SEMESTER_2";
    sequence?: "SEQUENCE_1" | "SEQUENCE_2" | "SEQUENCE_3";
    score: number;
    maxScore?: number;
    comment?: string;
  }) => {
    const { data } = await api.post<Grade>("/grades", payload);
    return data;
  },

  update: async (
    gradeId: string,
    payload: Partial<{
      semester: "SEMESTER_1" | "SEMESTER_2";
      sequence: "SEQUENCE_1" | "SEQUENCE_2" | "SEQUENCE_3";
      score: number;
      maxScore: number;
      comment: string;
    }>
  ) => {
    const { data } = await api.patch<Grade>(`/grades/${gradeId}`, payload);
    return data;
  },

  import: async (file: File, schoolId?: string) => {
    const formData = new FormData();
    formData.append("file", file);

    if (schoolId) {
      formData.append("schoolId", schoolId);
    }

    const { data } = await api.post("/grades/import", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    return data as {
      createdCount: number;
      errorCount: number;
      errors: Array<{ row: number; message: string }>;
      importBatchId: string;
    };
  }
};

export const analyticsApi = {
  student: async (studentId: string) => {
    const { data } = await api.get<StudentAnalytics>(`/analytics/student/${studentId}`);
    return data;
  },

  class: async (classId: string, semester: "SEMESTER_1" | "SEMESTER_2") => {
    const { data } = await api.get<ClassAnalytics>(`/analytics/class/${classId}`, {
      params: { semester }
    });

    return data;
  },

  teacherEvolution: async (teacherId: string, semester?: "SEMESTER_1" | "SEMESTER_2") => {
    const { data } = await api.get<TeacherEvolution>(`/analytics/teacher/${teacherId}/evolution`, {
      params: semester ? { semester } : undefined
    });

    return data;
  },

  school: async (schoolId: string) => {
    const { data } = await api.get<SchoolAnalytics>(`/analytics/school/${schoolId}`);
    return data;
  },

  simulateStudent: async (
    studentId: string,
    payload: {
      semester: "SEMESTER_1" | "SEMESTER_2";
      sequence?: "SEQUENCE_1" | "SEQUENCE_2" | "SEQUENCE_3";
      subjectId: string;
      score: number;
      maxScore?: number;
    }
  ) => {
    const { data } = await api.post<StudentProjection>(`/analytics/student/${studentId}/simulate`, payload);
    return data;
  }
};

export const orientationApi = {
  student: async (studentId: string) => {
    const { data } = await api.get<OrientationProfile>(`/orientation/student/${studentId}`);
    return data;
  },

  recomputeStudent: async (studentId: string) => {
    const { data } = await api.post<OrientationProfile>(`/orientation/student/${studentId}/recompute`);
    return data;
  },

  school: async (schoolId: string) => {
    const { data } = await api.get<OrientationProfile[]>(`/orientation/school/${schoolId}`);
    return data;
  }
};

export const accompanimentApi = {
  studentOverview: async (studentId: string) => {
    const { data } = await api.get<AccompanimentOverview>(`/accompaniment/student/${studentId}/overview`);
    return data;
  },

  listPlans: async (studentId: string) => {
    const { data } = await api.get<StudentPlan[]>(`/accompaniment/student/${studentId}/plans`);
    return data;
  },

  createPlan: async (
    studentId: string,
    payload: {
      title: string;
      description?: string;
      status?: "A_FAIRE" | "EN_COURS" | "TERMINE";
      dueDate?: string;
    }
  ) => {
    const { data } = await api.post<StudentPlan>(`/accompaniment/student/${studentId}/plans`, payload);
    return data;
  },

  updatePlan: async (
    planId: string,
    payload: Partial<{
      title: string;
      description: string;
      status: "A_FAIRE" | "EN_COURS" | "TERMINE";
      dueDate: string;
    }>
  ) => {
    const { data } = await api.patch<StudentPlan>(`/accompaniment/plans/${planId}`, payload);
    return data;
  },

  listAlerts: async (studentId: string) => {
    const { data } = await api.get<StudentAlert[]>(`/accompaniment/student/${studentId}/alerts`);
    return data;
  },

  createAlert: async (
    studentId: string,
    payload: {
      severity: "INFO" | "ATTENTION" | "CRITIQUE";
      category: string;
      title: string;
      message: string;
    }
  ) => {
    const { data } = await api.post<StudentAlert>(`/accompaniment/student/${studentId}/alerts`, payload);
    return data;
  },

  markAlertAsRead: async (alertId: string) => {
    const { data } = await api.patch<StudentAlert>(`/accompaniment/alerts/${alertId}/read`);
    return data;
  }
};

export const guidanceApi = {
  studentHub: async (studentId: string) => {
    const { data } = await api.get<GuidanceHub>(`/guidance/student/${studentId}/hub`);
    return data;
  },

  remediation: async (studentId: string) => {
    const { data } = await api.get<RemediationItem[]>(`/guidance/student/${studentId}/remediation`);
    return data;
  },

  addPlanTask: async (
    planId: string,
    payload: {
      title: string;
      description?: string;
      status?: "A_FAIRE" | "EN_COURS" | "TERMINE";
      dueDate?: string;
      assignedToUserId?: string;
    }
  ) => {
    const { data } = await api.post(`/guidance/plans/${planId}/tasks`, payload);
    return data;
  },

  addAttendance: async (
    studentId: string,
    payload: {
      date?: string;
      status: "PRESENT" | "ABSENT" | "RETARD";
      note?: string;
    }
  ) => {
    const { data } = await api.post(`/guidance/student/${studentId}/attendance`, payload);
    return data;
  },

  addIncident: async (
    studentId: string,
    payload: {
      category: string;
      severity: "INFO" | "ATTENTION" | "CRITIQUE";
      description: string;
      occurredAt?: string;
    }
  ) => {
    const { data } = await api.post(`/guidance/student/${studentId}/incidents`, payload);
    return data;
  },

  addCompetency: async (
    studentId: string,
    payload: {
      category: "ACADEMIQUE" | "COMMUNICATION" | "LEADERSHIP" | "COLLABORATION" | "AUTONOMIE" | "NUMERIQUE" | "CREATIVITE";
      label: string;
      score: number;
      comment?: string;
    }
  ) => {
    const { data } = await api.post(`/guidance/student/${studentId}/competencies`, payload);
    return data;
  },

  createOpportunity: async (payload: {
    schoolId?: string;
    title: string;
    description: string;
    type: "FILIERE" | "METIER" | "BOURSE" | "CONCOURS" | "PROGRAMME";
    targetStream?: "SCIENTIFIQUE" | "LITTERAIRE" | "ECONOMIQUE" | "TECHNIQUE" | "AUTRE";
    targetLevel?:
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
    targetProfile?: "ELEVE" | "ETUDIANT";
    targetSchoolType?: "COLLEGE" | "HIGH_SCHOOL" | "UNIVERSITY";
    location?: string;
    deadline?: string;
    tags?: string;
  }) => {
    const { data } = await api.post(`/guidance/opportunities`, payload);
    return data;
  },

  matchOpportunities: async (studentId: string) => {
    const { data } = await api.get(`/guidance/student/${studentId}/opportunities/matches`);
    return data;
  },

  addInternship: async (
    studentId: string,
    payload: {
      type: "STAGE" | "ALTERNANCE";
      title: string;
      organization: string;
      status?: "EN_COURS" | "PRESELECTIONNE" | "ACCEPTE" | "REFUSE";
      notes?: string;
    }
  ) => {
    const { data } = await api.post(`/guidance/student/${studentId}/internships`, payload);
    return data;
  },

  addMentorship: async (
    studentId: string,
    payload: {
      mentorUserId?: string;
      mentorName: string;
      topic: string;
      scheduledAt: string;
      status?: "PLANIFIEE" | "TERMINEE" | "ANNULEE";
      meetingLink?: string;
      notes?: string;
    }
  ) => {
    const { data } = await api.post(`/guidance/student/${studentId}/mentorship`, payload);
    return data;
  },

  addJournal: async (
    studentId: string,
    payload: {
      weekStart: string;
      summary: string;
      parentNote?: string;
      teacherNote?: string;
      tips?: string;
    }
  ) => {
    const { data } = await api.post(`/guidance/student/${studentId}/journal`, payload);
    return data;
  },

  addPortfolio: async (
    studentId: string,
    payload: {
      title: string;
      description?: string;
      category: "PROJET" | "CERTIFICATION" | "ACTIVITE" | "DISTINCTION";
      url?: string;
      evidence?: string;
    }
  ) => {
    const { data } = await api.post(`/guidance/student/${studentId}/portfolio`, payload);
    return data;
  },

  addWellbeing: async (
    studentId: string,
    payload: {
      mood: number;
      stress: number;
      energy: number;
      comment?: string;
    }
  ) => {
    const { data } = await api.post(`/guidance/student/${studentId}/wellbeing`, payload);
    return data;
  },

  addBadge: async (
    studentId: string,
    payload: {
      badgeType: "PROGRESSION" | "REGULARITE" | "EXCELLENCE" | "LEADERSHIP" | "ENTRAIDE";
      title: string;
      description?: string;
      points?: number;
    }
  ) => {
    const { data } = await api.post(`/guidance/student/${studentId}/badges`, payload);
    return data;
  },

  alumniStats: async (schoolId: string) => {
    const { data } = await api.get(`/guidance/school/${schoolId}/alumni-stats`);
    return data as {
      total: number;
      verified: number;
      byType: Record<string, number>;
      byYear: Record<string, number>;
    };
  },

  addAlumni: async (
    schoolId: string,
    payload: {
      studentId?: string;
      fullName?: string;
      graduationYear: number;
      outcomeType: "ETUDES_SUP" | "EMPLOI" | "ENTREPRENEURIAT" | "AUTRE";
      organization?: string;
      country?: string;
      isVerified?: boolean;
    }
  ) => {
    const { data } = await api.post(`/guidance/school/${schoolId}/alumni`, payload);
    return data;
  },

  syncExternalGrades: async (payload: {
    schoolId?: string;
    source: string;
    teacherId?: string;
    rows: Array<{
      registrationNumber: string;
      subjectName: string;
      semester: "SEMESTER_1" | "SEMESTER_2";
      sequence?: "SEQUENCE_1" | "SEQUENCE_2" | "SEQUENCE_3";
      score: number;
      maxScore?: number;
      comment?: string;
    }>;
  }) => {
    const { data } = await api.post(`/guidance/integrations/grades-sync`, payload);
    return data as {
      importBatchId: string;
      createdCount: number;
      errorCount: number;
      errors: Array<{ row: number; message: string }>;
    };
  }
};

export const chatApi = {
  listEmojis: async () => {
    const { data } = await api.get<ChatEmoji[]>("/chat/emojis");
    return data;
  },

  listGroups: async (params?: Record<string, string>) => {
    const { data } = await api.get<DiscussionGroup[]>("/chat/groups", { params });
    return data;
  },

  autoJoin: async () => {
    const { data } = await api.post<DiscussionGroup>("/chat/groups/auto-join");
    return data;
  },

  createGroup: async (payload: {
    profileType: "ELEVE" | "ETUDIANT";
    level:
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
    stream: "SCIENTIFIQUE" | "LITTERAIRE" | "ECONOMIQUE" | "TECHNIQUE" | "AUTRE";
    academicYear: string;
    name?: string;
  }) => {
    const { data } = await api.post<DiscussionGroup>("/chat/groups", payload);
    return data;
  },

  listMessages: async (groupId: string, limit?: number) => {
    const { data } = await api.get<DiscussionMessage[]>(`/chat/groups/${groupId}/messages`, {
      params: limit ? { limit } : undefined
    });
    return data;
  },

  postMessage: async (groupId: string, content: string) => {
    const { data } = await api.post<DiscussionMessage>(`/chat/groups/${groupId}/messages`, { content });
    return data;
  },

  uploadAttachment: async (groupId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await api.post<ChatUploadResult>(`/chat/groups/${groupId}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    return data;
  },

  deleteMessage: async (messageId: string) => {
    const { data } = await api.delete(`/chat/messages/${messageId}`);
    return data;
  }
};

export const superAdminApi = {
  dashboard: async () => {
    const { data } = await api.get<SuperAdminDashboardAnalytics>("/superadmin/dashboard");
    return data;
  },

  listEstablishments: async () => {
    const { data } = await api.get<EstablishmentCard[]>("/superadmin/establishments");
    return data;
  },

  getEstablishmentDetails: async (
    schoolId: string,
    params?: {
      search?: string;
      page?: number;
      pageSize?: number;
    }
  ) => {
    const { data } = await api.get<EstablishmentDetails>(`/superadmin/establishments/${schoolId}`, {
      params
    });
    return data;
  },

  importStudents: async (
    schoolId: string,
    file: File,
    payload?: {
      defaultAcademicYear?: string;
      defaultLevel?: string;
      defaultStream?: string;
      defaultProfileType?: string;
    }
  ) => {
    const formData = new FormData();
    formData.append("file", file);

    if (payload?.defaultAcademicYear) {
      formData.append("defaultAcademicYear", payload.defaultAcademicYear);
    }
    if (payload?.defaultLevel) {
      formData.append("defaultLevel", payload.defaultLevel);
    }
    if (payload?.defaultStream) {
      formData.append("defaultStream", payload.defaultStream);
    }
    if (payload?.defaultProfileType) {
      formData.append("defaultProfileType", payload.defaultProfileType);
    }

    const { data } = await api.post<StudentImportResult>(
      `/superadmin/establishments/${schoolId}/students/import`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );
    return data;
  },

  listAnnouncements: async (params?: {
    page?: number;
    pageSize?: number;
    targetSchoolId?: string;
    includeUnpublished?: boolean;
  }) => {
    const { data } = await api.get<AnnouncementPage>("/superadmin/announcements", { params });
    return data;
  },

  createAnnouncement: async (payload: {
    title: string;
    content: string;
    startsAt?: string;
    endsAt?: string;
    targetSchoolId?: string;
    isPublished?: boolean;
  }) => {
    const { data } = await api.post("/superadmin/announcements", payload);
    return data;
  },

  dreamProgress: async (params?: {
    schoolId?: string;
    level?: string;
    profileType?: "ELEVE" | "ETUDIANT";
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const { data } = await api.get<DreamProgressReport>("/superadmin/progression", { params });
    return data;
  }
};
