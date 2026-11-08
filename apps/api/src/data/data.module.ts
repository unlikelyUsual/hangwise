import { Global, Module } from "@nestjs/common";
import { ENV, type Env } from "../config/env";
import { buildDemoDataset } from "../demo/dataset";
import { PrismaService } from "../prisma/prisma.service";
import { HANGWISE_DATA } from "./hangwise-data";
import { MemoryHangwiseData } from "./memory-hangwise-data";
import { PrismaHangwiseData } from "./prisma-hangwise-data";

@Global()
@Module({
  providers: [
    {
      provide: HANGWISE_DATA,
      inject: [ENV, PrismaService],
      useFactory: (env: Env, prisma: PrismaService) =>
        env.repository === "memory" ? new MemoryHangwiseData(buildDemoDataset(new Date())) : new PrismaHangwiseData(prisma),
    },
  ],
  exports: [HANGWISE_DATA],
})
export class DataModule {}
