-- CreateTable
CREATE TABLE "guild" (
    "id" TEXT NOT NULL,
    "discord_guild_id" TEXT NOT NULL,
    "levels_channel_id" TEXT,
    "padrino_merito_role_id" TEXT,

    CONSTRAINT "guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "discord_channel_id" TEXT NOT NULL,

    CONSTRAINT "channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "discord_message_id" TEXT NOT NULL,
    "discord_command_name" TEXT,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "discord_role_id" TEXT NOT NULL,
    "discord_role_name" TEXT NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reaction_role" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "discord_role_id" TEXT NOT NULL,
    "discord_emoji_id" TEXT,

    CONSTRAINT "message_reaction_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reaction_button" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "discord_button_id" TEXT NOT NULL,

    CONSTRAINT "reaction_button_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "discord_user_id" TEXT NOT NULL,
    "discord_display_name" TEXT NOT NULL,
    "discord_avatar" TEXT NOT NULL,
    "discord_temporal_level_xp" INTEGER NOT NULL,
    "discord_temporal_level" INTEGER NOT NULL,
    "discord_temporal_level_cooldown" TEXT NOT NULL,
    "my_padrino_id" TEXT,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "padrino" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "long_description" TEXT NOT NULL,

    CONSTRAINT "padrino_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guild_discord_guild_id_key" ON "guild"("discord_guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_discord_channel_id_key" ON "channel"("discord_channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_discord_message_id_key" ON "message"("discord_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_discord_role_id_key" ON "role"("discord_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_discord_user_id_key" ON "member"("discord_user_id");

-- CreateIndex
CREATE INDEX "member_discord_temporal_level_discord_temporal_level_xp_idx" ON "member"("discord_temporal_level" DESC, "discord_temporal_level_xp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "padrino_member_id_key" ON "padrino"("member_id");

-- AddForeignKey
ALTER TABLE "channel" ADD CONSTRAINT "channel_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reaction_role" ADD CONSTRAINT "message_reaction_role_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reaction_role" ADD CONSTRAINT "message_reaction_role_discord_role_id_fkey" FOREIGN KEY ("discord_role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_button" ADD CONSTRAINT "reaction_button_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_my_padrino_id_fkey" FOREIGN KEY ("my_padrino_id") REFERENCES "padrino"("id") ON DELETE SET NULL ON UPDATE CASCADE;
