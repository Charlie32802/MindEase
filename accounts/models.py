import json
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models

class CustomUserManager(BaseUserManager):
    def create_user(self, email, full_name, password=None, role="user", **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, full_name=full_name, role=role, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        
        # Set admin-irrelevant fields to NULL
        extra_fields.setdefault("gender", None)
        extra_fields.setdefault("emergency_contact_name", None)
        extra_fields.setdefault("emergency_contact_phone", None)
        extra_fields.setdefault("emergency_contact_relationship", None)
        extra_fields.setdefault("accepted_privacy_policy", None)
        extra_fields.setdefault("is_verified", None)
        extra_fields.setdefault("specializations", None)
        
        return self.create_user(email, full_name, password, role="admin", **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ("user", "User"),
        ("counselor", "Counselor"),
        ("admin", "Admin"),
    )
    
    GENDER_CHOICES = (
        ('male', 'Male'),
        ('female', 'Female'),
        ('prefer_not_to_say', 'Prefer Not To Say'),
    )
    
    RELATIONSHIP_CHOICES = (
        ('parent', 'Parent'),
        ('sibling', 'Sibling'),
        ('partner', 'Partner'),
        ('friend', 'Friend'),
        ('relative', 'Relative'),
    )

    # Basic information
    email = models.EmailField(unique=True, max_length=191)
    full_name = models.CharField(max_length=100)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="user")

    # User-specific fields - changed to allow NULL and no default values for admin-irrelevant fields
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, null=True, blank=True)
    emergency_contact_name = models.CharField(max_length=100, null=True, blank=True)
    emergency_contact_phone = models.CharField(max_length=15, null=True, blank=True)
    emergency_contact_relationship = models.CharField(
        max_length=20, 
        choices=RELATIONSHIP_CHOICES, 
        null=True,
        blank=True
    )
    accepted_privacy_policy = models.BooleanField(null=True, blank=True)

    # Account status & permissions
    is_verified = models.BooleanField(null=True, blank=True)  # NULL for admins
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Counselor-specific fields - all should allow NULL for admins
    specializations = models.JSONField(null=True, blank=True)  # NULL for admins/users
    other_specializations = models.TextField(null=True, blank=True)  # NULL for admins
    institution_name = models.CharField(max_length=255, null=True, blank=True)  # NULL for admins
    institution_email = models.EmailField(null=True, blank=True)  # NULL for admins
    license_number = models.CharField(max_length=100, null=True, blank=True)  # NULL for admins
    years_experience = models.IntegerField(null=True, blank=True)
    bio = models.TextField(null=True, blank=True)  # NULL for admins

    # File uploads - NULL for admins
    professional_id = models.FileField(upload_to='professional_ids/', null=True, blank=True)
    degree_certificate = models.FileField(upload_to='degree_certificates/', null=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    def __str__(self):
        return f"{self.full_name} ({self.role})"

    # Display helpers for admin panel
    def get_age_display(self):
        if self.role == "user" and self.age is not None:
            return str(self.age)
        return "N/A"
    
    def get_gender_display_admin(self):
        if self.role == "user" and self.gender:
            return dict(self.GENDER_CHOICES).get(self.gender, self.gender)
        return "N/A"
    
    def get_emergency_contact_display(self):
        if self.role == "user" and self.emergency_contact_name:
            relationship = dict(self.RELATIONSHIP_CHOICES).get(
                self.emergency_contact_relationship, 
                self.emergency_contact_relationship or ''
            )
            return f"{self.emergency_contact_name} ({relationship}) - {self.emergency_contact_phone}"
        return "N/A"
    
    def get_relationship_display(self):
        if self.role == "user" and self.emergency_contact_relationship:
            return dict(self.RELATIONSHIP_CHOICES).get(
                self.emergency_contact_relationship, 
                self.emergency_contact_relationship
            )
        return "N/A"
    
    def get_bio_display(self):
        if self.role == "counselor" and self.bio:
            return self.bio
        return "N/A"
    
    def get_specializations_display(self):
        if self.role == "counselor" and self.specializations:
            try:
                # Handle both JSON string and actual JSON data
                if isinstance(self.specializations, str):
                    # First try to parse the outer JSON string
                    parsed_json = json.loads(self.specializations)
                    # If it's still a string, parse again
                    if isinstance(parsed_json, str):
                        specs = json.loads(parsed_json)
                    else:
                        specs = parsed_json
                else:
                    specs = self.specializations
                
                if specs and isinstance(specs, list):
                    # Remove "Other Mild Concerns" if it exists in the list
                    filtered_specs = [spec for spec in specs if spec != "Other Mild Concerns"]
                    if filtered_specs:
                        return ", ".join(filtered_specs)
                    elif "Other Mild Concerns" in specs and self.other_specializations:
                        return "Other Concerns"
            except (json.JSONDecodeError, TypeError):
                pass
        return "N/A"
    
    def get_institution_display(self):
        if self.role == "counselor" and self.institution_name:
            return f"{self.institution_name} ({self.institution_email})"
        return "N/A"
    
    def get_experience_display(self):
        if self.role == "counselor" and self.years_experience is not None:
            return f"{self.years_experience} years"
        return "N/A"
    
    def get_license_display(self):
        if self.role == "counselor" and self.license_number:
            return self.license_number
        return "N/A"
    
    def get_verified_display(self):
        if self.role == "admin":
            return "N/A"
        elif self.role == "counselor":
            # Handle rejected counselors (inactive AND not verified)
            if not self.is_active and self.is_verified == False:
                return "Rejected"
            elif self.is_verified == True:
                return "Verified"
            elif self.is_verified == False and self.is_active:
                return "Pending Review"
            else:
                return "Unknown Status"
        else:
            return "N/A"

    def get_active_display(self):
        return "Active" if self.is_active else "Inactive"

    def get_staff_display(self):
        return "Yes" if self.is_staff else "No"

    def get_superuser_display(self):
        return "Yes" if self.is_superuser else "No"

    class Meta:
        db_table = 'user_accounts'

    #def get_specializations_list(self):
    #    try:
    #        if isinstance(self.specializations, str):
    #            import json
    #            data = json.loads(self.specializations)   
    #            if data and isinstance(data, list):
    #               cleaned = []
    #                for item in data:
    #                    cleaned.append(item.replace("\n", "").replace(" ", ""))
    #                return cleaned
    #        elif isinstance(self.specializations, list):
    #            return [item.strip() for item in self.specializations]
    #    except Exception:
    #        pass
    #    return []


    def get_specializations_list(self):
        try:
            if not self.specializations:
                return []

            # If stored as JSON string
            if isinstance(self.specializations, str):
                import json
                data = json.loads(self.specializations)
                # Handle double-encoded JSON
                if isinstance(data, str):
                    data = json.loads(data)
                if isinstance(data, list):
                    return [item.strip() for item in data if item.strip()]
            
            # If stored as a list
            elif isinstance(self.specializations, list):
                return [item.strip() for item in self.specializations if item.strip()]

        except Exception:
            pass

        return []
