import {
  SignUpSchema,
  SignInSchema,
  SaveProjectSchema,
  AIGenerationSchema,
  FileSchema,
  validateRequest,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('SignUpSchema', () => {
    it('should validate valid signup data', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!@#',
      };

      const result = validateRequest(SignUpSchema, data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass123!@#',
        });
      }
    });

    it('should reject invalid email', () => {
      const data = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'SecurePass123!@#',
      };

      const result = validateRequest(SignUpSchema, data);

      expect(result.success).toBe(false);
    });

    it('should reject weak password', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak',
      };

      const result = validateRequest(SignUpSchema, data);

      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securepass123!@#',
      };

      const result = validateRequest(SignUpSchema, data);

      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
      };

      const result = validateRequest(SignUpSchema, data);

      expect(result.success).toBe(false);
    });

    it('should lowercase email', () => {
      const data = {
        name: 'John Doe',
        email: 'JOHN@EXAMPLE.COM',
        password: 'SecurePass123!@#',
      };

      const result = validateRequest(SignUpSchema, data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('john@example.com');
      }
    });

    it('should trim name', () => {
      const data = {
        name: '  John Doe  ',
        email: 'john@example.com',
        password: 'SecurePass123!@#',
      };

      const result = validateRequest(SignUpSchema, data);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
      }
    });

    it('should reject name over 100 characters', () => {
      const data = {
        name: 'a'.repeat(101),
        email: 'john@example.com',
        password: 'SecurePass123!@#',
      };

      const result = validateRequest(SignUpSchema, data);

      expect(result.success).toBe(false);
    });
  });

  describe('SignInSchema', () => {
    it('should validate valid signin data', () => {
      const data = {
        email: 'john@example.com',
        password: 'password123',
      };

      const result = validateRequest(SignInSchema, data);

      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid',
        password: 'password123',
      };

      const result = validateRequest(SignInSchema, data);

      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const data = {
        email: 'john@example.com',
        password: '',
      };

      const result = validateRequest(SignInSchema, data);

      expect(result.success).toBe(false);
    });
  });

  describe('SaveProjectSchema', () => {
    it('should validate valid project data', () => {
      const data = {
        projectId: null,
        name: 'My Project',
        projectType: 'website',
        activeAgents: '[]',
        messages: [
          { id: '1', role: 'user', content: 'Hello' },
        ],
      };

      const result = validateRequest(SaveProjectSchema, data);

      expect(result.success).toBe(true);
    });

    it('should reject invalid message role', () => {
      const data = {
        projectId: null,
        name: 'My Project',
        projectType: 'website',
        activeAgents: '[]',
        messages: [
          { id: '1', role: 'invalid', content: 'Hello' },
        ],
      };

      const result = validateRequest(SaveProjectSchema, data);

      expect(result.success).toBe(false);
    });

    it('should reject name over 100 characters', () => {
      const data = {
        projectId: null,
        name: 'a'.repeat(101),
        projectType: 'website',
        activeAgents: '[]',
        messages: [],
      };

      const result = validateRequest(SaveProjectSchema, data);

      expect(result.success).toBe(false);
    });
  });

  describe('AIGenerationSchema', () => {
    it('should validate valid AI generation request', () => {
      const data = {
        messages: [
          { id: '1', role: 'user', content: 'Generate a website' },
        ],
        projectType: 'website',
        agents: ['ui-designer'],
      };

      const result = validateRequest(AIGenerationSchema, data);

      expect(result.success).toBe(true);
    });

    it('should reject empty messages', () => {
      const data = {
        messages: [],
        projectType: 'website',
        agents: [],
      };

      const result = validateRequest(AIGenerationSchema, data);

      expect(result.success).toBe(false);
    });

    it('should reject too many messages', () => {
      const messages = Array.from({ length: 51 }, (_, i) => ({
        id: String(i),
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'Message',
      }));

      const data = {
        messages,
        projectType: 'website',
        agents: [],
      };

      const result = validateRequest(AIGenerationSchema, data);

      expect(result.success).toBe(false);
    });

    it('should reject message content over 10000 chars', () => {
      const data = {
        messages: [
          { id: '1', role: 'user', content: 'a'.repeat(10001) },
        ],
        projectType: 'website',
        agents: [],
      };

      const result = validateRequest(AIGenerationSchema, data);

      expect(result.success).toBe(false);
    });

    it('should accept optional specialized agent', () => {
      const data = {
        messages: [
          { id: '1', role: 'user', content: 'Test' },
        ],
        projectType: 'website',
        agents: [],
        specializedAgent: 'ui-designer',
      };

      const result = validateRequest(AIGenerationSchema, data);

      expect(result.success).toBe(true);
    });
  });

  describe('FileSchema', () => {
    it('should validate valid file data', () => {
      const data = {
        path: 'src/index.html',
        content: '<html>Test</html>',
        language: 'html',
      };

      const result = validateRequest(FileSchema, data);

      expect(result.success).toBe(true);
    });

    it('should reject invalid file path characters', () => {
      const data = {
        path: 'src/index*.html',
        content: '<html>Test</html>',
        language: 'html',
      };

      const result = validateRequest(FileSchema, data);

      expect(result.success).toBe(false);
    });

    it('should reject path over 255 characters', () => {
      const data = {
        path: 'a'.repeat(256),
        content: '<html>Test</html>',
        language: 'html',
      };

      const result = validateRequest(FileSchema, data);

      expect(result.success).toBe(false);
    });

    it('should reject file content over 50KB', () => {
      const data = {
        path: 'large.txt',
        content: 'a'.repeat(51 * 1024),
        language: 'plaintext',
      };

      const result = validateRequest(FileSchema, data);

      expect(result.success).toBe(false);
    });

    it('should reject invalid language', () => {
      const data = {
        path: 'test.txt',
        content: 'test',
        language: 'invalid',
      };

      const result = validateRequest(FileSchema, data);

      expect(result.success).toBe(false);
    });
  });
});
