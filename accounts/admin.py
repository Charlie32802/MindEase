from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib import messages
from .models import User
from .forms import CustomUserCreationForm
import json


class CustomUserAdmin(UserAdmin):
    """Custom admin interface for User model"""
    model = User
    add_form = CustomUserCreationForm
    add_form_template = 'admin_panel/add_form.html'
    
    # Override the default list_display to prevent inheritance issues
    list_display = []  # Will be set by get_list_display()

    def get_list_display(self, request):
        """Dynamically show columns based on what users exist"""
        # Base fields always shown
        base_fields = ["id", "full_name", "email", "role", "get_password_status"]
        
        # Check if we have users with relevant data
        has_users = User.objects.filter(role='user').exists()
        has_counselors = User.objects.filter(role='counselor').exists()
        
        additional_fields = []
        
        if has_users:
            additional_fields.extend([
                "get_age_display", "get_gender_display_admin", 
                "get_emergency_contact_display"
            ])
        
        if has_counselors:
            additional_fields.extend([
                "get_specializations_display", "get_other_specializations_display",
                "get_institution_display", "get_license_display", 
                "get_experience_display"
            ])
        
        # Privacy policy for users and counselors
        if has_users or has_counselors:
            additional_fields.append("accepted_privacy_policy")
            
        # Verification status for counselors
        if has_counselors:
            additional_fields.append("get_verified_display")
        
        # Always show status fields
        additional_fields.extend([
            "get_active_display", "get_staff_display", 
            "get_superuser_display", "created_at"
        ])
        
        return base_fields + additional_fields

    list_filter = ("role", "is_verified", "is_active", "is_staff", "gender", "created_at")
    search_fields = ("email", "full_name", "emergency_contact_name")
    ordering = ("-created_at",)
    readonly_fields = (
        "created_at", "last_login", "get_age_display",
        "get_gender_display_admin", "get_emergency_contact_display",
        "get_specializations_display", "get_other_specializations_display"
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email', 'full_name', 'role', 'password1', 'password2',
                'age', 'gender', 'emergency_contact_name',
                'emergency_contact_phone', 'emergency_contact_relationship',
                'accepted_privacy_policy', 'is_verified', 'is_active',
                'is_staff', 'is_superuser', 'specializations',
                'other_specializations', 'institution_name',
                'institution_email', 'license_number', 'years_experience',
                'bio', 'professional_id', 'degree_certificate'
            )
        }),
    )

    def get_fieldsets(self, request, obj=None):
        """Dynamic fieldsets based on user role"""
        if not obj:  # Adding new user
            return self.add_fieldsets
            
        base_fieldset = [
            ("Basic Information", {"fields": ("full_name", "email", "role", "password")}),
        ]
        
        # Add role-specific sections
        if obj.role == 'user':
            base_fieldset.extend([
                ("Personal Details", {"fields": ("get_age_display", "get_gender_display_admin")}),
                ("Emergency Contacts", {"fields": ("get_emergency_contact_display",)}),
                ("Account Status", {"fields": ("accepted_privacy_policy", "is_active")}),
            ])
        elif obj.role == 'counselor':
            base_fieldset.extend([
                ("Professional Information", {
                    "fields": ("get_specializations_display", "get_other_specializations_display", 
                              "get_institution_display", "get_license_display", 
                              "get_experience_display", "get_bio_display")
                }),
                ("Account Status", {"fields": ("accepted_privacy_policy", "is_verified", "is_active")}),
            ])
        elif obj.role == 'admin':
            base_fieldset.append(
                ("Account Status", {"fields": ("is_active",)})
            )
        
        # Always add permissions and dates
        base_fieldset.extend([
            ("Permissions", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
            ("Important Dates", {"fields": ("created_at", "last_login")}),
        ])
        
        return base_fieldset

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj is None:
            if request.method == 'POST':
                role = request.POST.get('role')
            else:
                role = form.base_fields['role'].initial or 'user'

            if role == 'user':
                form.base_fields['is_active'].initial = True
                form.base_fields['is_staff'].initial = False
                form.base_fields['is_superuser'].initial = False
                form.base_fields['is_verified'].initial = False

            elif role == 'counselor':
                form.base_fields['is_active'].initial = True
                form.base_fields['is_staff'].initial = True
                form.base_fields['is_superuser'].initial = False
                form.base_fields['is_verified'].initial = False

            elif role == 'admin':
                form.base_fields['is_active'].initial = True
                form.base_fields['is_staff'].initial = True
                form.base_fields['is_superuser'].initial = True
                form.base_fields['is_verified'].initial = False

        return form

    # Display helper methods
    def get_password_status(self, obj):
        return "Set" if obj.password else "Not Set"
    get_password_status.short_description = 'Password'

    def get_verified_display(self, obj):
        """Updated verification display that properly handles rejected counselors"""
        if obj.role == "admin":
            return "N/A"
        elif obj.role == "counselor":
            # Handle rejected counselors (inactive AND not verified)
            if not obj.is_active and obj.is_verified == False:
                return "Rejected"
            elif obj.is_verified == True:
                return "Verified" 
            elif obj.is_verified == False and obj.is_active:
                return "Pending Review"
            else:
                return "Unknown Status"
        else:
            return "N/A"
    get_verified_display.short_description = 'Verification Status'

    def get_active_display(self, obj):
        return "Active" if obj.is_active else "Inactive"
    get_active_display.short_description = 'Status'

    def get_staff_display(self, obj):
        return "Yes" if obj.is_staff else "No"
    get_staff_display.short_description = 'Staff'

    def get_superuser_display(self, obj):
        return "Yes" if obj.is_superuser else "No"
    get_superuser_display.short_description = 'Superuser'

    def get_age_display(self, obj):
        return obj.get_age_display()
    get_age_display.short_description = 'Age'
    get_age_display.admin_order_field = 'age'

    def get_gender_display_admin(self, obj):
        return obj.get_gender_display_admin()
    get_gender_display_admin.short_description = 'Gender'

    def get_emergency_contact_display(self, obj):
        return obj.get_emergency_contact_display()
    get_emergency_contact_display.short_description = 'Emergency Contact'

    # Counselor-specific display methods
    def get_specializations_display(self, obj):
        if obj.role != "counselor" or not obj.specializations:
            return "N/A"
            
        try:
            # Parse the JSON specializations
            if isinstance(obj.specializations, str):
                specs = json.loads(obj.specializations)
            else:
                specs = obj.specializations
                
            if not specs:
                return "None"
                
            # Remove 'other' if it exists and there are other_specializations
            if 'other' in specs and obj.other_specializations:
                specs.remove('other')
                
            if not specs:
                return "None"
                
            # Format with & before the last item
            if len(specs) > 1:
                # Capitalize each specialization
                capitalized_specs = [spec.capitalize() for spec in specs]
                return ", ".join(capitalized_specs[:-1]) + " & " + capitalized_specs[-1]
            else:
                return specs[0].capitalize()
        except:
            return "Error parsing specializations"
    get_specializations_display.short_description = 'Specializations'

    def get_other_specializations_display(self, obj):
        if obj.role == "counselor" and obj.other_specializations:
            return obj.other_specializations
        return "N/A"
    get_other_specializations_display.short_description = 'Other Specializations'

    def get_institution_display(self, obj):
        return obj.get_institution_display()
    get_institution_display.short_description = 'Institution'

    def get_license_display(self, obj):
        return obj.get_license_display()
    get_license_display.short_description = 'License'

    def get_experience_display(self, obj):
        return obj.get_experience_display()
    get_experience_display.short_description = 'Experience'

    def get_bio_display(self, obj):
        return obj.get_bio_display()
    get_bio_display.short_description = 'Bio'


# Register with default admin site (if needed)
admin.site.register(User, CustomUserAdmin)