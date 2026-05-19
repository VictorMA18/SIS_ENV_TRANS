import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models

from common.enums.user import UserRole

class UserManager(BaseUserManager):
  """
  Manager personalizado para el modelo User.
  Maneja la creación de usuarios clásicos y de administradores.
  Los usuarios OAuth se crean sin contraseña (password=None).
  """

  def _create(self, email, full_name, role, password=None, **extra_fields):
    if not email:
      raise ValueError('El email es obligatorio.')
    if not full_name:
      raise ValueError('El nombre completo es obligatorio.')
    if role not in UserRole.values:
      raise ValueError(f'Rol inválido: {role}')

    email = self.normalize_email(email)

    if 'avatar_url' not in extra_fields or not extra_fields['avatar_url']:
      from urllib.parse import quote_plus
      formatted_name = quote_plus(full_name)
      extra_fields['avatar_url'] = f"https://ui-avatars.com/api/?name={formatted_name}&background=6366f1&color=fff&size=128&bold=true"

    user = self.model(email=email, full_name=full_name,
                      role=role, **extra_fields)

    # set_password(None) guarda un hash inutilizable,
    # obligando al usuario a autenticarse solo vía OAuth.
    user.set_password(password)
    user.save(using=self._db)
    return user

  def create_user(self, email, full_name, role, password, **extra_fields):
    extra_fields.setdefault('is_active',   True)
    extra_fields.setdefault('is_verified', False)
    return self._create(email, full_name, role, password, **extra_fields)

  def create_oauth_user(self, email, full_name, role, **extra_fields):
    """Crea un usuario sin contraseña, exclusivamente para Google OAuth."""
    extra_fields.setdefault('is_active',   True)
    extra_fields.setdefault('is_verified', True)  # Google ya verificó el email
    return self._create(email, full_name, role, password=None, **extra_fields)

  def create_admin(self, email, full_name, password, **extra_fields):
    """
    Crea un usuario ADMIN. Solo debe usarse desde scripts/seeders,
    nunca desde la interfaz web.
    """
    extra_fields.setdefault('is_active',   True)
    extra_fields.setdefault('is_verified', True)
    return self._create(email, full_name, UserRole.ADMIN, password, **extra_fields)

  def create_superuser(self, email, full_name, password=None, **extra_fields):
    """
    Requerido por Django para el comando 'createsuperuser'.
    El rol siempre se fuerza a ADMIN sin importar lo que se escriba.
    """
    extra_fields.setdefault('is_active',   True)
    extra_fields.setdefault('is_verified', True)
    return self._create(email, full_name, UserRole.ADMIN, password, **extra_fields)


class User(AbstractBaseUser):
  """
  Tabla base de autenticación del sistema.

  Representa a todos los actores: clientes, transportistas y administradores.
  Los perfiles específicos (Client, Transporter) extienden esta tabla
  mediante una relación OneToOne usando el mismo UUID como PK.

  AbstractBaseUser provee automáticamente:
    - password    → almacena el hash de la contraseña (nullable para OAuth)
    - last_login  → se actualiza en cada inicio de sesión exitoso
  """

  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  email = models.EmailField(max_length=150, unique=True)
  full_name = models.CharField(max_length=150)
  avatar_url = models.URLField(max_length=500, blank=True, null=True)
  phone = models.CharField(max_length=20, blank=True, null=True)
  role = models.CharField(max_length=20, choices=UserRole.choices)
  is_active = models.BooleanField(default=True)
  is_verified = models.BooleanField(default=False)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  USERNAME_FIELD = 'email'
  REQUIRED_FIELDS = ['full_name']

  objects: UserManager = UserManager() # type: ignore

  class Meta:
    db_table = 'users'
    ordering = ['-created_at']

  def __str__(self):
    return f'{self.full_name} <{self.email}> [{self.role}]'

  # ------------------------------------------------------------------
  # Helpers de rol
  # ------------------------------------------------------------------

  @property
  def is_client(self) -> bool:
    return self.role == UserRole.CLIENT

  @property
  def is_transporter(self) -> bool:
    return self.role == UserRole.TRANSPORTER

  @property
  def is_admin(self) -> bool:
    return self.role == UserRole.ADMIN

  # ------------------------------------------------------------------
  # Propiedades requeridas por Django Admin
  # Solo los ADMIN tienen acceso al panel de administración.
  # ------------------------------------------------------------------

  @property
  def is_staff(self) -> bool:
    return self.role == UserRole.ADMIN

  @property
  def is_superuser(self) -> bool:
    return self.role == UserRole.ADMIN

  def has_perm(self, perm, obj=None) -> bool:
    return self.role == UserRole.ADMIN

  def has_module_perms(self, app_label) -> bool:
    return self.role == UserRole.ADMIN
