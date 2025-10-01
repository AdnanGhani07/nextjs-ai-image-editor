"use server";

import { db } from "~/server/db";
import { auth } from "~/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

interface CreateProjectData {
  imageUrl: string;
  imageKitId: string;
  filePath: string;
  name?: string;
}

export async function createProject(data: CreateProjectData) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const project = await db.project.create({
      data: {
        name: data.name ?? "Untitled Project",
        imageUrl: data.imageUrl,
        imageKitId: data.imageKitId,
        filePath: data.filePath,
        userId: session.user.id,
      },
    });

    return { success: true, project };
  } catch (error) {
    console.error("Project creation error:", error);
    return { success: false, error: "Failed to create project" };
  }
}

export async function getUserProjects() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const projects = await db.project.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, projects };
  } catch (error) {
    console.error("Failed to fetch user projects:", error);
    return { success: false, error: "Failed to get user projects" };
  }
}

export async function deductCredits(
  creditsToDeduct: number,
  operation?: string,
) {
  try {
    // Input validation - prevent negative numbers or invalid inputs
    if (
      !creditsToDeduct ||
      creditsToDeduct <= 0 ||
      !Number.isInteger(creditsToDeduct)
    ) {
      return { success: false, error: "Invalid credits amount!" };
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      throw new Error("Unauthorised");
    }

    //First check if user has enough credits
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        credits: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.credits < creditsToDeduct) {
      return { success: false, error: "Not enough credits!" };
    }

    //Deduct credits
    const updatedUser = await db.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        credits: user.credits - creditsToDeduct,
      },
    });

    return { success: true, remainingCredits: updatedUser.credits };
  } catch (error) {
    console.error(
      `Credit deduction error${operation ? ` for ${operation}` : ""}:`,
      error,
    );
    return { success: false, error: "Failed to deduct credits" };
  }
}

export async function deleteProject(projectId: string, imageKitId: string) {
  try {
    // Then, delete the project record from the database
    await db.project.delete({
      where: { id: projectId },
    });

    // Revalidate the projects page to show the updated list
    revalidatePath("/dashboard/projects");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete project:", error);
    return { success: false, error: "Failed to delete project." };
  }
}

//Legacy functions for backward compatibility
// export async function deductCreditsForBackgroundRemoval() {
//   return deductCredits(1, "Background Removal");
// }

// export async function deductCreditsForUpscaling() {
//   return deductCredits(1, "Upscaling");
// }

