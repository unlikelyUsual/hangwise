import { Controller, Get, Inject, Module, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, Length } from "class-validator";
import { Public } from "../auth/public.decorator";
import { HANGWISE_DATA, type HangwiseData } from "../data/hangwise-data";
import { DomainError } from "../domain/errors";
import { presentAvailability, presentCompanion } from "../domain/present";

class ListCompanionsQuery {
  @ApiPropertyOptional({ example: "Bangkok" })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  city?: string;
}

@ApiTags("companions")
@Controller("v1/companions")
export class CompanionsController {
  constructor(@Inject(HANGWISE_DATA) private readonly data: HangwiseData) {}

  @Public()
  @Get()
  async list(@Query() query: ListCompanionsQuery) {
    const rows = await this.data.listListedCompanions(query.city);
    return rows.map(presentCompanion);
  }

  @Public()
  @Get(":id")
  async get(@Param("id", ParseUUIDPipe) id: string) {
    return presentCompanion(await this.listed(id));
  }

  @Public()
  @Get(":id/availability")
  async availability(@Param("id", ParseUUIDPipe) id: string) {
    const companion = await this.listed(id);
    const windows = await this.data.listAvailability(companion.id);
    return windows.map(presentAvailability);
  }

  private async listed(id: string) {
    const companion = await this.data.getCompanion(id);
    if (!companion || companion.status !== "listed") {
      throw new DomainError("NOT_FOUND", "Companion not found.", 404);
    }
    return companion;
  }
}

@Module({ controllers: [CompanionsController] })
export class CompanionsModule {}
