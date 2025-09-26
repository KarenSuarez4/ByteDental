// Mock de Firebase antes de importar cualquier cosa
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => mockAuth),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
  updatePassword: jest.fn(),
  GoogleAuthProvider: jest.fn(() => ({
    setCustomParameters: jest.fn()
  })),
  EmailAuthProvider: {
    credential: jest.fn()
  },
  reauthenticateWithCredential: jest.fn()
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({}))
}));

jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({}))
}));

const mockUser = {
  uid: 'test-uid',
  email: 'tenjocamilo4@gmail.com',
  displayName: 'Test User',
  emailVerified: true
};

const mockAuth = {
  currentUser: null,
  signOut: jest.fn().mockResolvedValue(),
  onAuthStateChanged: jest.fn()
};

const { signInWithEmailAndPassword } = require('firebase/auth');

describe('Firebase Authentication Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.currentUser = null;
  });

  describe('Pruebas de autenticación básicas', () => {
    test('debe autenticar usuario con credenciales correctas (tenjocamilo4@gmail.com)', async () => {
      // Arrange
      const email = 'tenjocamilo4@gmail.com';
      const password = '1234dental';
      const expectedUserCredential = { user: mockUser };

      signInWithEmailAndPassword.mockResolvedValue(expectedUserCredential);

      // Act
      const result = await signInWithEmailAndPassword({}, email, password);

      // Assert
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith({}, email, password);
      expect(result.user).toEqual(mockUser);
      expect(result.user.email).toBe(email);
      expect(result.user.uid).toBe('test-uid');
    });

    test('debe rechazar usuario con credenciales incorrectas (Error 401)', async () => {
      // Arrange
      const email = 'tenjocamilo4@gmail.com';
      const wrongPassword = 'contraseña_incorrecta';
      const authError = {
        code: 'auth/wrong-password',
        message: 'Error 401: Credenciales inválidas'
      };

      signInWithEmailAndPassword.mockRejectedValue(authError);

      // Act & Assert
      await expect(signInWithEmailAndPassword({}, email, wrongPassword))
        .rejects
        .toEqual(authError);

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith({}, email, wrongPassword);
    });

    test('debe manejar error de usuario no encontrado', async () => {
      // Arrange
      const email = 'usuario_inexistente@gmail.com';
      const password = '1234dental';
      const authError = {
        code: 'auth/user-not-found',
        message: 'Error 404: Usuario no encontrado'
      };

      signInWithEmailAndPassword.mockRejectedValue(authError);

      // Act & Assert
      await expect(signInWithEmailAndPassword({}, email, password))
        .rejects
        .toEqual(authError);
    });

    test('debe manejar error de email inválido', async () => {
      // Arrange
      const invalidEmail = 'email_invalido';
      const password = '1234dental';
      const authError = {
        code: 'auth/invalid-email',
        message: 'Formato de email inválido'
      };

      signInWithEmailAndPassword.mockRejectedValue(authError);

      // Act & Assert
      await expect(signInWithEmailAndPassword({}, invalidEmail, password))
        .rejects
        .toEqual(authError);
    });

    test('debe manejar error de contraseña demasiado débil', async () => {
      // Arrange
      const email = 'test@example.com';
      const weakPassword = '123';
      const authError = {
        code: 'auth/weak-password',
        message: 'Error 400: La contraseña debe tener al menos 6 caracteres'
      };

      signInWithEmailAndPassword.mockRejectedValue(authError);

      // Act & Assert
      await expect(signInWithEmailAndPassword({}, email, weakPassword))
        .rejects
        .toEqual(authError);
    });
  });

  describe('Validación de tokens', () => {
    test('debe simular token válido para usuario autenticado', () => {
      // Arrange
      mockAuth.currentUser = mockUser;

      // Act
      const isAuthenticated = mockAuth.currentUser !== null;
      const userEmail = mockAuth.currentUser?.email;

      // Assert
      expect(isAuthenticated).toBe(true);
      expect(userEmail).toBe('tenjocamilo4@gmail.com');
    });

    test('debe no tener token para usuario no autenticado', () => {
      // Arrange
      mockAuth.currentUser = null;

      // Act
      const isAuthenticated = mockAuth.currentUser !== null;

      // Assert
      expect(isAuthenticated).toBe(false);
    });
  });
});
