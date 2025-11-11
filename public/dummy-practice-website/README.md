# Dummy Practice Website - Localhost Setup

This is a complete multi-page dental practice website for testing your CRM forms locally.

## 📁 Files

- `index.html` - Homepage
- `contact.html` - Contact Us page (with form)
- `appointment.html` - Book Appointment page (with form)
- `services.html` - Services page

## 🚀 How to View

### Option 1: Direct File Opening
1. Open `index.html` in your browser
2. Navigate between pages using the menu

### Option 2: Local Server (Recommended)
```bash
# From the dummy-practice-website directory
python3 -m http.server 8080
```

Then visit: `http://localhost:8080`

## 📝 Form Integration

Both `contact.html` and `appointment.html` have your CRM form embedded:

```html
<iframe 
    src="http://localhost:3000/f/bd04a1ec-5525-4fa2-889b-b74834c11749" 
    width="100%" 
    height="600" 
    frameborder="0">
</iframe>
```

**Make sure your CRM is running on `http://localhost:3000`** for the forms to work!

## 🎯 Pages

1. **Home** (`index.html`) - Landing page with services overview
2. **Services** (`services.html`) - Detailed services page
3. **Contact Us** (`contact.html`) - Contact form page
4. **Book Appointment** (`appointment.html`) - Appointment booking form page

## 🔧 Customization

All pages use the same form URL. If you create different forms for contact vs appointment:
- Update the iframe `src` in `contact.html`
- Update the iframe `src` in `appointment.html`

## ✅ Testing Checklist

- [ ] Open `index.html` in browser
- [ ] Click "Contact Us" - form should load
- [ ] Click "Book Appointment" - form should load
- [ ] Fill out form and submit
- [ ] Check CRM to see submission

---

**Note:** This is for localhost testing only. For production, update URLs to your production domain.
