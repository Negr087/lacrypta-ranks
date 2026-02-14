"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaTest = void 0;
// Import Prisma Client
const prismaClient_1 = require("./prismaClient");
class PrismaTest {
    // Create User
    static async createUser(email) {
        console.info('Creating user...');
        const user = await prismaClient_1.prisma.user.create({
            data: {
                email: email,
            },
        });
        console.info('User created!');
        return user;
    }
    // Get all users
    static async listUsers() {
        console.info('Listing users...');
        const users = await prismaClient_1.prisma.user.findMany();
        return users;
    }
    // Find user by email
    static async findUserByEmail(email) {
        console.info('Finding user...');
        const user = await prismaClient_1.prisma.user.findUnique({
            where: {
                email: email,
            },
        });
        return user;
    }
    // Create post for a user
    static async createPost(title, content, userId) {
        console.info('Creating post...');
        const post = await prismaClient_1.prisma.post.create({
            data: {
                title: title,
                content: content,
                author: {
                    connect: {
                        id: userId,
                    },
                },
            },
        });
        return post;
    }
    // Update post by Id
    static async updatePost(id, title, content) {
        console.info('Updating post...');
        const post = await prismaClient_1.prisma.post.update({
            where: {
                id: id,
            },
            data: {
                title: title,
                content: content,
            },
        });
        return post;
    }
    // Get all posts by a user
    static async getUserPosts(userId) {
        console.info('Getting user posts...');
        const posts = await prismaClient_1.prisma.post.findMany({
            where: {
                authorId: userId,
            },
            orderBy: {
                title: 'asc',
            },
            take: 10,
        });
        return posts;
    }
}
exports.PrismaTest = PrismaTest;
