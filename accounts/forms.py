from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import authenticate
from .models import User


class UserRegistrationForm(UserCreationForm):
    """Form for regular user registration"""
    
    class Meta:
        model = User
        fields = (
            'email', 'password1', 'password2', 'full_name', 'age', 'gender',
            'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relationship', 'accepted_privacy_policy'
        )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make privacy policy required for users
        self.fields['accepted_privacy_policy'].required = True
        
        # Add custom widgets and attributes
        self.fields['email'].widget.attrs.update({
            'placeholder': 'Enter your email address',
            'class': 'form-control'
        })
        self.fields['full_name'].widget.attrs.update({
            'placeholder': 'Enter your full name',
            'class': 'form-control'
        })
        self.fields['age'].widget.attrs.update({
            'placeholder': 'Enter your age',
            'class': 'form-control',
            'min': '13',
            'max': '100'
        })
        
    def clean_age(self):
        age = self.cleaned_data.get('age')
        if age and age < 13:
            raise forms.ValidationError("You must be at least 13 years old to register.")
        return age
    
    def clean_accepted_privacy_policy(self):
        accepted = self.cleaned_data.get('accepted_privacy_policy')
        if not accepted:
            raise forms.ValidationError("You must accept the privacy policy to register.")
        return accepted
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.role = 'user'
        user.is_staff = False
        user.is_superuser = False
        if commit:
            user.save()
        return user


class CounselorRegistrationForm(UserCreationForm):
    """Simple counselor registration form - relies on JS for most validation"""
    
    class Meta:
        model = User
        fields = (
            'email', 'password1', 'password2', 'full_name',
            'specializations', 'other_specializations', 'institution_name',
            'institution_email', 'license_number', 'years_experience',
            'bio', 'professional_id', 'degree_certificate', 'accepted_privacy_policy'
        )
    
    def clean_accepted_privacy_policy(self):
        accepted = self.cleaned_data.get('accepted_privacy_policy')
        if not accepted:
            raise forms.ValidationError("You must accept the privacy policy.")
        return accepted
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.role = 'counselor'
        user.is_staff = True
        user.is_superuser = False
        user.is_verified = False  # Requires admin approval
        if commit:
            user.save()
        return user


class UserAuthenticationForm(AuthenticationForm):
    """General authentication form for users and counselors (not admin)"""
    
    username = forms.EmailField(
        label="Email",
        widget=forms.EmailInput(attrs={
            "autofocus": True,
            "placeholder": "Enter your email",
            "class": "form-control"
        })
    )
    
    password = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(attrs={
            "placeholder": "Enter your password",
            "class": "form-control"
        })
    )

    def clean(self):
        email = self.cleaned_data.get("username")
        password = self.cleaned_data.get("password")

        if email and password:
            self.user_cache = authenticate(
                self.request,
                username=email,
                password=password
            )

            if self.user_cache is None:
                if not User.objects.filter(email=email).exists():
                    self.add_error("username", "No account found with this email address.")
                else:
                    self.add_error(None, "Invalid email or password.")
            elif not self.user_cache.is_active:
                self.add_error(None, "This account has been deactivated.")
            elif self.user_cache.role == 'counselor' and not self.user_cache.is_verified:
                self.add_error(None, "Your counselor account is pending verification. Please wait for admin approval.")

        return self.cleaned_data


class ProfileUpdateForm(forms.ModelForm):
    """Form for updating user profiles"""
    
    class Meta:
        model = User
        fields = [
            'full_name', 'age', 'gender', 'emergency_contact_name', 
            'emergency_contact_phone', 'emergency_contact_relationship'
        ]
    
    def __init__(self, *args, **kwargs):
        user = kwargs.get('instance')
        super().__init__(*args, **kwargs)
        
        # Only show relevant fields based on user role
        if user and user.role != 'user':
            # Remove user-specific fields for non-users
            user_fields = [
                'age', 'gender', 'emergency_contact_name', 
                'emergency_contact_phone', 'emergency_contact_relationship'
            ]
            for field in user_fields:
                if field in self.fields:
                    del self.fields[field]
                    
        # Add CSS classes
        for field in self.fields.values():
            field.widget.attrs.update({'class': 'form-control'})
    
    def clean_age(self):
        age = self.cleaned_data.get('age')
        if age and age < 13:
            raise forms.ValidationError("Age must be at least 13.")
        return age


class CounselorProfileUpdateForm(forms.ModelForm):
    """Form for updating counselor profiles"""
    
    class Meta:
        model = User
        fields = [
            'full_name', 'specializations', 'other_specializations', 
            'institution_name', 'institution_email', 'years_experience', 
            'bio'
        ]
        # Note: Excluded sensitive fields like license_number, professional_id, degree_certificate
        # These should only be editable by admin or through a separate verification process
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Add CSS classes
        for field in self.fields.values():
            field.widget.attrs.update({'class': 'form-control'})
            
        # Add help text
        self.fields['bio'].help_text = "Professional biography (minimum 100 characters)"
        self.fields['specializations'].help_text = "JSON list of specializations"
    
    def clean_bio(self):
        bio = self.cleaned_data.get('bio')
        if bio and len(bio) < 100:
            raise forms.ValidationError("Bio must be at least 100 characters long.")
        return bio
    
    def clean_years_experience(self):
        experience = self.cleaned_data.get('years_experience')
        if experience is not None and experience < 0:
            raise forms.ValidationError("Years of experience cannot be negative.")
        return experience


# Admin-specific forms
class CustomUserCreationForm(forms.ModelForm):
    """Custom user creation form for admin interface only"""
    password1 = forms.CharField(label='Password', widget=forms.PasswordInput, required=False)
    password2 = forms.CharField(label='Password confirmation', widget=forms.PasswordInput, required=False)
    
    # Explicitly define BooleanFields to ensure they appear
    accepted_privacy_policy = forms.BooleanField(label='Accepted privacy policy', required=False)
    is_verified = forms.BooleanField(label='Verified', required=False)
    is_active = forms.BooleanField(label='Active', required=False)
    is_staff = forms.BooleanField(label='Staff status', required=False)
    is_superuser = forms.BooleanField(label='Superuser status', required=False)

    class Meta:
        model = User
        fields = '__all__'
        widgets = {
            'gender': forms.Select(attrs={'class': 'form-control'}),
            'emergency_contact_relationship': forms.Select(attrs={'class': 'form-control'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Make ALL fields not required initially - we'll handle validation manually
        for field_name, field in self.fields.items():
            if not isinstance(field, forms.BooleanField):
                field.required = False
        
        # COMPLETELY REPLACE the choice fields with custom ones that have proper empty options
        if 'gender' in self.fields:
            # Remove the old field and create a new one
            del self.fields['gender']
            # Create new field with empty option as first choice
            gender_choices = [('', 'Select Gender')] + list(User.GENDER_CHOICES)
            self.fields['gender'] = forms.ChoiceField(
                choices=gender_choices,
                required=False,
                label='Gender',
                widget=forms.Select(attrs={'class': 'form-control'})
            )
        
        if 'emergency_contact_relationship' in self.fields:
            # Remove the old field and create a new one  
            del self.fields['emergency_contact_relationship']
            # Create new field with empty option as first choice
            relationship_choices = [('', 'Select Relationship')] + list(User.RELATIONSHIP_CHOICES)
            self.fields['emergency_contact_relationship'] = forms.ChoiceField(
                choices=relationship_choices,
                required=False,
                label='Emergency contact relationship',
                widget=forms.Select(attrs={'class': 'form-control'})
            )

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Passwords don't match")
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        if self.cleaned_data.get("password1"):
            user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
        return user

    def clean(self):
        cleaned_data = super().clean()
        role = cleaned_data.get('role')

        # Define all required fields for each role
        role_required_fields = {
            'user': [
                'email', 'full_name', 'password1', 'password2',
                'age', 'gender', 'emergency_contact_name',
                'emergency_contact_phone', 'emergency_contact_relationship',
                'accepted_privacy_policy'
            ],
            'counselor': [
                'email', 'full_name', 'password1', 'password2',
                'specializations', 'institution_name', 'institution_email', 
                'license_number', 'years_experience', 'bio', 'professional_id', 
                'degree_certificate', 'accepted_privacy_policy'
            ],
            'admin': [
                'email', 'full_name', 'password1', 'password2',
                'is_staff', 'is_superuser'
            ]
        }

        # Check required fields for the selected role
        if role in role_required_fields:
            for field in role_required_fields[role]:
                if field == 'specializations':
                    # Special handling for specializations - check if at least one is selected
                    specializations = cleaned_data.get(field)
                    if not specializations or (isinstance(specializations, list) and len(specializations) == 0):
                        self.add_error(field, "This field is required.")
                elif field in ['is_staff', 'is_superuser']:
                    # For boolean fields, check if they are explicitly True
                    if not cleaned_data.get(field):
                        self.add_error(field, "This field is required.")
                elif field == 'accepted_privacy_policy':
                    # For privacy policy, must be True
                    if not cleaned_data.get(field):
                        self.add_error(field, "This field is required.")
                elif field in ['gender', 'emergency_contact_relationship']:
                    # For choice fields, ensure they're not empty string
                    value = cleaned_data.get(field)
                    if not value or value == '':
                        self.add_error(field, "This field is required.")
                else:
                    # For regular fields, check if they have a value
                    if not cleaned_data.get(field):
                        self.add_error(field, "This field is required.")

        return cleaned_data

class EmailAuthenticationForm(AuthenticationForm):
    """Authentication form for admin panel (email-based)"""
    
    username = forms.EmailField(
        label="Email",
        widget=forms.EmailInput(attrs={
            "autofocus": True,
            "placeholder": "Enter your email",
            "class": "form-control"
        })
    )
    
    password = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(attrs={
            "placeholder": "Enter your password",
            "class": "form-control"
        })
    )