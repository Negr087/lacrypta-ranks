// Import Prisma Client
import { prisma } from './prismaClient';
import { User, Post } from '@prisma/client';

export class PrismaTest {
  // Create User
  static async createUser(email: string): Promise<User> {
    console.info('Creating user...');
    const user = await prisma.user.create({
      data: {
        email: email,
      },
    });
    console.info('User created!');

    return user;
  }

  // Get all users
  static async listUsers(): Promise<User[]> {
    console.info('Listing users...');
    const users = await prisma.user.findMany();

    return users;
  }

  // Find user by email
  static async findUserByEmail(email: string): Promise<User | null> {
    console.info('Finding user...');
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    return user;
  }

  // Create post for a user
  static async createPost(title: string, content: string, userId: number): Promise<Post> {
    console.info('Creating post...');
    const post = await prisma.post.create({
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
  static async updatePost(id: number, title: string, content: string): Promise<Post | null> {
    console.info('Updating post...');
    const post = await prisma.post.update({
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
  static async getUserPosts(userId: number): Promise<Post[]> {
    console.info('Getting user posts...');
    const posts = await prisma.post.findMany({
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
