import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// If your Prisma file is located elsewhere, you can change the path
import { PrismaClient } from "@prisma/client";
import { Polar } from "@polar-sh/sdk";
import { env } from "~/env";
import {
    polar,
    checkout,
    portal,
    webhooks,
  } from "@polar-sh/better-auth";
import { db } from "~/server/db";


const polarClient = new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server: 'sandbox'
});

const prisma = new PrismaClient();
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql", // or "mysql", "postgresql", ...etc
    }),
    emailAndPassword: {
        enabled: true,
    },
    plugins: [
        polar({
          client: polarClient,
          createCustomerOnSignUp: true,
          use: [
            checkout({
              products: [
                {
                  productId: "b380a24e-f807-48cb-89b5-d6c09b63d3cd",
                  slug: "small",
                },
                {
                  productId: "67e1c7e8-0a0b-403b-9099-38542b128311",
                  slug: "medium",
                },
                {
                  productId: "7e954226-1c47-4d9c-a9a4-779b8dde084a",
                  slug: "large",
                },
              ],
              successUrl: "/dashboard",
              authenticatedUsersOnly: true,
            }),
            portal(),
            webhooks({
              secret: env.POLAR_WEBHOOK_SECRET,
              onOrderPaid: async (order) => {
                const externalCustomerId = order.data.customer.externalId;
    
                if (!externalCustomerId) {
                  console.error("No external customer ID found.");
                  throw new Error("No external customer id found.");
                }
    
                const productId = order.data.productId;
    
                let creditsToAdd = 0;
    
                switch (productId) {
                  case "b380a24e-f807-48cb-89b5-d6c09b63d3cd":
                    creditsToAdd = 50;
                    break;
                  case "67e1c7e8-0a0b-403b-9099-38542b128311":
                    creditsToAdd = 200;
                    break;
                  case "7e954226-1c47-4d9c-a9a4-779b8dde084a":
                    creditsToAdd = 400;
                    break;
                }
    
                await db.user.update({
                  where: { id: externalCustomerId },
                  data: {
                    credits: {
                      increment: creditsToAdd,
                    },
                  },
                });
              },
            }),
          ],
        }),
      ],
});