import { Body, Controller, Get, HttpCode, Inject, Module, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiProperty, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";
import { CurrentActor } from "../auth/current-actor.decorator";
import { HANGWISE_DATA, type HangwiseData } from "../data/hangwise-data";
import { DomainError } from "../domain/errors";
import { presentMessage } from "../domain/present";
import type { Actor } from "../domain/types";

class CreateMessageDto {
  @ApiProperty()
  @IsString()
  @Length(1, 2000)
  body!: string;
}

@ApiTags("chat")
@ApiSecurity("devUser")
@ApiSecurity("devSecret")
@Controller("v1/conversations")
export class ChatController {
  constructor(@Inject(HANGWISE_DATA) private readonly data: HangwiseData) {}

  @Get()
  async list(@CurrentActor() actor: Actor) {
    const rows = await this.data.listConversations(actor.userId);
    return rows.map((row) => ({ ...row, demo: true }));
  }

  @Get(":id/messages")
  async messages(@CurrentActor() actor: Actor, @Param("id", ParseUUIDPipe) id: string) {
    await this.requireMember(actor.userId, id);
    const messages = await this.data.listMessages(id);
    return { demo: true, conversationId: id, messages: messages.map(presentMessage) };
  }

  @Post(":id/messages")
  @HttpCode(201)
  async post(@CurrentActor() actor: Actor, @Param("id", ParseUUIDPipe) id: string, @Body() body: CreateMessageDto) {
    const members = await this.requireMember(actor.userId, id);
    const text = body.body.trim();
    if (text.length < 1 || text.length > 2000) {
      throw new DomainError("INVALID_MESSAGE", "Message must be 1 to 2000 characters.", 422);
    }
    for (const member of members) {
      if (member !== actor.userId && (await this.data.hasBlock(actor.userId, member))) {
        throw new DomainError("FORBIDDEN", "Messaging is blocked between these accounts.", 403);
      }
    }
    return presentMessage(await this.data.addMessage(id, actor.userId, text));
  }

  private async requireMember(userId: string, conversationId: string): Promise<string[]> {
    const members = await this.data.conversationMemberIds(conversationId);
    if (!members.includes(userId)) throw new DomainError("NOT_FOUND", "Conversation not found.", 404);
    return members;
  }
}

@Module({ controllers: [ChatController] })
export class ChatModule {}
