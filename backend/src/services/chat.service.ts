import { Role, Stream, StudentLevel, StudentProfileType } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { applyEmojiShortcodes } from "../utils/chat-emoji";
import { isSchoolAdminRole } from "../utils/tenant";

interface CreateGroupPayload {
  profileType: StudentProfileType;
  level: StudentLevel;
  stream: Stream;
  academicYear: string;
  name?: string;
}

interface PostMessagePayload {
  content: string;
}

interface GroupFilter {
  profileType?: StudentProfileType;
  level?: StudentLevel;
  stream?: Stream;
  academicYear?: string;
}

function defaultAcademicYear() {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
}

function buildUniqueKey(profileType: StudentProfileType, level: StudentLevel, stream: Stream, academicYear: string) {
  return `${profileType}_${level}_${stream}_${academicYear}`.toUpperCase();
}

function buildGroupName(profileType: StudentProfileType, level: StudentLevel, stream: Stream, academicYear: string) {
  const profile = profileType === StudentProfileType.ETUDIANT ? "Etudiants" : "Eleves";
  return `${profile} ${level} ${stream} (${academicYear})`;
}

export class ChatService {
  private async actorStudent(actor: Express.AuthUser) {
    if (!(actor.role === Role.STUDENT || actor.role === Role.UNIVERSITY_STUDENT)) {
      return null;
    }

    const student = await prisma.student.findFirst({
      where: {
        userId: actor.id,
        isActive: true
      },
      include: {
        class: {
          select: {
            academicYear: true
          }
        }
      }
    });

    if (!student) {
      throw new AppError(403, "Profil apprenant introuvable");
    }

    return student;
  }

  private async ensureActorCanAccessGroup(actor: Express.AuthUser, groupId: string) {
    const group = await prisma.discussionGroup.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      throw new AppError(404, "Groupe introuvable");
    }

    if (actor.role === Role.SUPER_ADMIN || isSchoolAdminRole(actor.role) || actor.role === Role.TEACHER) {
      return group;
    }

    if (actor.role === Role.STUDENT || actor.role === Role.UNIVERSITY_STUDENT) {
      const student = await this.actorStudent(actor);

      if (!student) {
        throw new AppError(403, "Acces interdit");
      }

      const academicYear = student.class?.academicYear ?? defaultAcademicYear();
      const allowed =
        group.profileType === student.profileType &&
        group.level === student.level &&
        group.stream === student.stream &&
        group.academicYear === academicYear;

      if (!allowed) {
        throw new AppError(403, "Acces interdit a ce groupe");
      }

      return group;
    }

    if (actor.role === Role.PARENT) {
      const links = await prisma.parentStudent.findMany({
        where: {
          parentUserId: actor.id
        },
        include: {
          student: {
            include: {
              class: {
                select: {
                  academicYear: true
                }
              }
            }
          }
        }
      });

      const hasLinked = links.some((link) => {
        const academicYear = link.student.class?.academicYear ?? defaultAcademicYear();
        return (
          link.student.profileType === group.profileType &&
          link.student.level === group.level &&
          link.student.stream === group.stream &&
          academicYear === group.academicYear
        );
      });

      if (!hasLinked) {
        throw new AppError(403, "Acces interdit a ce groupe");
      }

      return group;
    }

    throw new AppError(403, "Acces interdit");
  }

  async assertGroupAccess(groupId: string, actor: Express.AuthUser) {
    return this.ensureActorCanAccessGroup(actor, groupId);
  }

  async assertCanPost(groupId: string, actor: Express.AuthUser) {
    await this.ensureActorCanAccessGroup(actor, groupId);

    if (actor.role === Role.PARENT) {
      throw new AppError(403, "Les parents ont un acces lecture uniquement");
    }
  }

  private async ensureGroup(payload: CreateGroupPayload, createdByUserId?: string) {
    const uniqueKey = buildUniqueKey(payload.profileType, payload.level, payload.stream, payload.academicYear);
    const name =
      payload.name?.trim() ||
      buildGroupName(payload.profileType, payload.level, payload.stream, payload.academicYear);

    return prisma.discussionGroup.upsert({
      where: { uniqueKey },
      create: {
        uniqueKey,
        name,
        profileType: payload.profileType,
        level: payload.level,
        stream: payload.stream,
        academicYear: payload.academicYear,
        createdByUserId
      },
      update: {
        name
      }
    });
  }

  async createGroup(payload: CreateGroupPayload, actor: Express.AuthUser) {
    if (!(actor.role === Role.SUPER_ADMIN || isSchoolAdminRole(actor.role) || actor.role === Role.TEACHER)) {
      throw new AppError(403, "Seuls les encadrants peuvent creer un groupe");
    }

    return this.ensureGroup(payload, actor.id);
  }

  async autoJoin(actor: Express.AuthUser) {
    const student = await this.actorStudent(actor);
    if (!student) {
      throw new AppError(403, "Action reservee aux apprenants");
    }

    const academicYear = student.class?.academicYear ?? defaultAcademicYear();
    return this.ensureGroup(
      {
        profileType: student.profileType,
        level: student.level,
        stream: student.stream,
        academicYear
      },
      actor.id
    );
  }

  async listGroups(actor: Express.AuthUser, filter: GroupFilter) {
    if (actor.role === Role.STUDENT || actor.role === Role.UNIVERSITY_STUDENT) {
      const student = await this.actorStudent(actor);
      if (!student) {
        return [];
      }

      const academicYear = student.class?.academicYear ?? defaultAcademicYear();
      await this.ensureGroup(
        {
          profileType: student.profileType,
          level: student.level,
          stream: student.stream,
          academicYear
        },
        actor.id
      );

      const groups = await prisma.discussionGroup.findMany({
        where: {
          profileType: student.profileType,
          level: student.level,
          stream: student.stream,
          academicYear
        },
        orderBy: {
          updatedAt: "desc"
        },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              senderUser: {
                select: {
                  id: true,
                  fullName: true,
                  school: {
                    select: {
                      id: true,
                      name: true,
                      code: true
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              messages: true
            }
          }
        }
      });

      return groups;
    }

    if (actor.role === Role.PARENT) {
      const links = await prisma.parentStudent.findMany({
        where: { parentUserId: actor.id },
        include: {
          student: {
            include: {
              class: {
                select: { academicYear: true }
              }
            }
          }
        }
      });

      const keys = new Set<string>();
      for (const link of links) {
        const year = link.student.class?.academicYear ?? defaultAcademicYear();
        keys.add(buildUniqueKey(link.student.profileType, link.student.level, link.student.stream, year));
      }

      if (!keys.size) {
        return [];
      }

      return prisma.discussionGroup.findMany({
        where: {
          uniqueKey: {
            in: Array.from(keys)
          }
        },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              senderUser: {
                select: {
                  id: true,
                  fullName: true,
                  school: {
                    select: {
                      id: true,
                      name: true,
                      code: true
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              messages: true
            }
          }
        },
        orderBy: {
          updatedAt: "desc"
        }
      });
    }

    return prisma.discussionGroup.findMany({
      where: {
        ...(filter.profileType ? { profileType: filter.profileType } : {}),
        ...(filter.level ? { level: filter.level } : {}),
        ...(filter.stream ? { stream: filter.stream } : {}),
        ...(filter.academicYear ? { academicYear: filter.academicYear } : {})
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            senderUser: {
              select: {
                id: true,
                fullName: true,
                school: {
                  select: {
                    id: true,
                    name: true,
                    code: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });
  }

  async listMessages(groupId: string, actor: Express.AuthUser, limit = 60) {
    await this.ensureActorCanAccessGroup(actor, groupId);

    return prisma.discussionMessage.findMany({
      where: {
        groupId
      },
      include: {
        senderUser: {
          select: {
            id: true,
            fullName: true,
            role: true,
            school: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      take: Math.min(Math.max(limit, 1), 200)
    });
  }

  async postMessage(groupId: string, payload: PostMessagePayload, actor: Express.AuthUser) {
    await this.assertCanPost(groupId, actor);

    const content = applyEmojiShortcodes(payload.content.trim()).trim();
    if (!content.length) {
      throw new AppError(400, "Le message est vide");
    }

    if (content.length > 1500) {
      throw new AppError(400, "Le message depasse 1500 caracteres");
    }

    return prisma.discussionMessage.create({
      data: {
        groupId,
        senderUserId: actor.id,
        content
      },
      include: {
        senderUser: {
          select: {
            id: true,
            fullName: true,
            role: true,
            school: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        }
      }
    });
  }

  async deleteMessage(messageId: string, actor: Express.AuthUser) {
    const message = await prisma.discussionMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      throw new AppError(404, "Message introuvable");
    }

    await this.ensureActorCanAccessGroup(actor, message.groupId);

    if (
      !(
        message.senderUserId === actor.id ||
        actor.role === Role.SUPER_ADMIN ||
        isSchoolAdminRole(actor.role) ||
        actor.role === Role.TEACHER
      )
    ) {
      throw new AppError(403, "Suppression interdite");
    }

    return prisma.discussionMessage.delete({
      where: { id: messageId }
    });
  }
}

export const chatService = new ChatService();
