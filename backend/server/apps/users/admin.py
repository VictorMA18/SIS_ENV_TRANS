from django.contrib import admin
from apps.users.models.user import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from apps.users.models.social_account import UserSocialAccount


@admin.register(User)
class UserAdmin(BaseUserAdmin):
  # 1. Configuración de las listas en el panel
  list_display = ('email', 'full_name', 'role',
                  'is_active', 'is_verified', "is_staff", "is_superuser",'created_at', "updated_at")
  list_filter = ('role', 'is_active', 'is_verified')
  search_fields = ('email', 'full_name')
  ordering = ('-created_at',)

  # 2. Desactivar los campos nativos que NO tienes en tu modelo
  # Al heredar de BaseUserAdmin, Django busca campos por defecto como 'username'.
  # Al redefinir los fieldsets, le decimos exactamente qué pintar en el formulario de edición.
  fieldsets = (
      (None, {'fields': ('email', 'password')}),
      ('Información Personal', {
        'fields': (
          'full_name', 'phone', 'avatar_url')}),
      ('Roles y Permisos', {'fields': ('role', 'is_active', 'is_verified', "is_staff", "is_superuser")}),
  )

  # propiedades de lectura
  readonly_fields = ('is_staff', 'is_superuser', 'created_at', 'updated_at')

  # 3. Configurar el formulario para CREAR usuarios nuevos desde el admin
  # Esto asegura que si creas un usuario clásico a mano, la contraseña se encripte.
  add_fieldsets = (
      (None, {
          'classes': ('wide',),
          'fields': ('email', 'full_name', 'role', 'password'),
      }),
  )

  filter_horizontal = ()

@admin.register(UserSocialAccount)
class UserSocialAccountAdmin(admin.ModelAdmin):
  list_display = ('user', 'provider', 'provider_uid', 'created_at')
  list_filter = ('provider',)
  search_fields = ('user__email', 'provider_uid')
