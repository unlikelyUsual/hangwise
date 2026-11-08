import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Equals, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min } from "class-validator";

export class CreateBookingDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  companionProfileId!: string;

  @ApiProperty({ example: "2026-11-12T03:00:00.000Z" })
  @IsISO8601()
  startsAt!: string;

  @ApiProperty({ example: "2026-11-12T05:00:00.000Z" })
  @IsISO8601()
  endsAt!: string;

  @ApiProperty({ example: "Lumpini Park" })
  @IsString()
  @Length(2, 120)
  venueName!: string;

  @ApiProperty({ example: "Pathum Wan" })
  @IsString()
  @Length(2, 120)
  venueArea!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ description: "Must be true. Acknowledges the public, non-sexual date policy." })
  @Equals(true)
  acknowledgedPublicDatePolicy!: boolean;
}

export class HoldBookingDto {
  @ApiProperty({ minimum: 15, maximum: 120, description: "Minutes until the hold expires. This does not authorize a payment." })
  @IsInt()
  @Min(15)
  @Max(120)
  holdMinutes!: number;
}
