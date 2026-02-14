import { User, Post } from '@prisma/client';
export declare class PrismaTest {
    static createUser(email: string): Promise<User>;
    static listUsers(): Promise<User[]>;
    static findUserByEmail(email: string): Promise<User | null>;
    static createPost(title: string, content: string, userId: number): Promise<Post>;
    static updatePost(id: number, title: string, content: string): Promise<Post | null>;
    static getUserPosts(userId: number): Promise<Post[]>;
}
//# sourceMappingURL=prismaTest.d.ts.map