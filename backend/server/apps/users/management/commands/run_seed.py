from django.core.management.base import BaseCommand
# Ajusta la ruta si tus modelos están estructurados en subcarpetas
from apps.users.models.user import User
from django.db import transaction


class Command(BaseCommand):
  help = 'Puebla la base de datos con un Superusuario y un Administrador inicial'

  def handle(self, *args, **options):
    self.stdout.write(self.style.WARNING('Iniciando el proceso de seeding...'))

    try:
      with transaction.atomic():
        # 1. Crear el Superusuario del sistema
        superuser_email = 'superuser@example.com'
        if not User.objects.filter(email=superuser_email).exists():
          # Usamos el método nativo que corregimos anteriormente
          User.objects.create_superuser( # type: ignore
              email=superuser_email,
              full_name='Super Administrador Global',
              password='SuperPassword123'
          )
          self.stdout.write(self.style.SUCCESS(
              f'✔ Superusuario creado con éxito ({superuser_email})'))
        else:
          self.stdout.write(self.style.NOTICE(
              f'i El superusuario {superuser_email} ya existe.'))

        # 2. Crear un Administrador común del sistema (Rol: ADMIN)
        admin_email = 'admin@example.com'
        if not User.objects.filter(email=admin_email).exists():
          # Aquí usamos tu método normal de creación pasándole el rol correspondiente
          User.objects.create_admin( # type: ignore
              email=admin_email,
              full_name='Administrador de Operaciones',
              password='AdminPassword123',
          )
          self.stdout.write(self.style.SUCCESS(
              f'✔ Usuario Administrador creado con éxito ({admin_email})'))
        else:
          self.stdout.write(self.style.NOTICE(
              f'i El administrador {admin_email} ya existe.'))

      self.stdout.write(self.style.SUCCESS(
          '¡Proceso de seeding finalizado correctamente!'))

    except Exception as e:
      self.stdout.write(self.style.ERROR(
          f'Ocurrió un error durante el seeding: {str(e)}'))
