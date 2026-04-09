<?php
session_name("user_session");
session_start();
require_once __DIR__ . '/includes/functions.php';

$role = 'public';
$currentPage = 'home';
$base = '.';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IdeaLink | ASCB E-Suggestion Platform</title>
    <link rel="stylesheet" href="assets/css/main.css">
    <link rel="stylesheet" href="assets/css/homepage.css">
</head>
<body>

<?php include 'includes/header.php'; ?>

<section id="hero" class="hero-home">
    <img class="school_logo" src="assets/images/school_logo.png" alt="ASCB Logo">
    <h1>Enhancing Management Feedback Through Innovation</h1>
    <p>The ASCB E-Suggestion Platform empowers everyone to share meaningful ideas.</p>
</section>

<!-- ABOUT US SECTION -->
<section id="about" class="about-section">
    <div class="wave-top">
        <svg viewBox="0 0 1440 150" preserveAspectRatio="none">
            <path fill="#1b2b48" d="M0,96L80,106.7C160,117,320,139,480,128C640,117,800,75,960,69.3C1120,64,1280,96,1360,112L1440,128L1440,0L0,0Z"></path>
        </svg>
    </div>
    <div class="about-container reveal">
        <div class="about-left reveal">
            <h2>ABOUT US</h2>
            <img src="assets/images/logo.png" alt="IdeaLink Logo" class="about-logo">
        </div>
        <div class="about-right">
            <p>The ASCB E-Suggestion Platform, known as <strong>IdeaLink</strong>, is a digital feedback system designed to enhance communication between management and the community.</p>
            <p>Our mission is to promote collaboration, accountability, and continuous improvement through technology-driven solutions.</p>
        </div>
    </div>
</section>

<?php
$loginDest = isset($_SESSION['user_id']) ? 'user/index.php' : 'user/login.php';
?>
<section id="suggestion" class="suggestion-section">
    <div class="suggestion-container reveal">
        <div class="suggestion-left">
            <span class="big-bulb">💡</span>
        </div>
        <div class="suggestion-right">
            <h2>Have a Brilliant Idea?</h2>
            <p>Your insights drive our innovation. Submit your suggestions today and help us build a better workplace together.</p>
            <button class="submit-btn" onclick="window.location.href='<?= $loginDest ?>'">Start Your Suggestion</button>
        </div>
    </div>
</section>

<section class="split-layout-container">
    <div class="news-column">
        <h2 id="latest_announ" class="section-title" style="color: #0c1524;">Latest News</h2>
        <div class="sticky-news-content">
            <div id="announcementList"></div>
            <div class="pagination" id="pagination">
                <button id="prevBtn">Previous</button>
                <span id="pageIndicator" class="page-indicator"></span>
                <button id="nextBtn">Next</button>
            </div>
        </div>
    </div>
</section>

<section id="highlights" class="testimonials-section">
    <h2 class="section-title" style="color: white;">Highlight Testimonies</h2>
    <div class="testimonial-wrapper">
        <div class="testimonial-glow-frame">
            <div class="testimonial-window">
                <div class="testimonial-slider" id="testimonialSlider"></div>
            </div>
        </div>
        <button id="prevTestimonial" class="slide-ctrl prev">&#10094;</button>
        <button id="nextTestimonial" class="slide-ctrl next">&#10095;</button>
        <div class="testimonial-dots" id="testimonialDots"></div>
    </div>
</section>

<?php include 'includes/footer.php'; ?>

<script src="assets/js/main.js"></script>
<script>
/* =========================================
   ANNOUNCEMENTS LOGIC
   ========================================= */
const announcementList = document.getElementById("announcementList");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageIndicator = document.getElementById("pageIndicator");

let announcements = [];
let currentPage = 1;
const itemsPerPage = 5;

function scrollToNews() {
    const newsContent = document.querySelector(".sticky-news-content");
    const isMobile = window.innerWidth <= 992;
    if (isMobile) {
        const newsSection = document.getElementById("latest_announ");
        const offset = newsSection.offsetTop - 100;
        window.scrollTo({ top: offset, behavior: "smooth" });
    } else {
        if (newsContent) newsContent.scrollTo({ top: 0, behavior: "smooth" });
    }
}

nextBtn.addEventListener("click", () => {
    if ((currentPage * itemsPerPage) < announcements.length) {
        currentPage++;
        renderAnnouncements();
        scrollToNews();
    }
});

prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderAnnouncements();
        scrollToNews();
    }
});

function renderAnnouncements() {
    announcementList.innerHTML = "";
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = announcements.slice(start, end);

    pageItems.forEach(a => {
        const dateObj = new Date(a.date_posted);
        const formattedDate = dateObj.toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "2-digit"
        });
        announcementList.innerHTML += `
            <div class="reveal">
                <span class="announcement-date">📅 ${formattedDate}</span>
                <h3>${a.title}</h3>
                <p>${a.message}</p>
            </div>
        `;
    });

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = end >= announcements.length;
    const totalPages = Math.ceil(announcements.length / itemsPerPage);
    pageIndicator.innerText = `Page ${currentPage} of ${totalPages}`;
    activateScrollAnimation();
}

function activateScrollAnimation() {
    const reveals = document.querySelectorAll(".reveal, .suggestion-container, .about-container");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });
    reveals.forEach((reveal) => observer.observe(reveal));
}

fetch("api/fetch_announcements.php")
    .then(res => res.json())
    .then(data => {
        announcements = data.sort((a, b) => new Date(b.date_posted) - new Date(a.date_posted));
        renderAnnouncements();
    });

/* =========================================
   TESTIMONIALS LOGIC
   ========================================= */
let testimonials = [];
let testIndex = 0;
let autoSlideTimer;
const testimonialSlider = document.getElementById("testimonialSlider");
const testimonialDots = document.getElementById("testimonialDots");

function initTestimonials() {
    fetch("api/fetch_testimonials.php")
        .then(res => res.json())
        .then(data => {
            testimonials = data;
            renderTestimonials();
            startAutoSlide();
        });
}

function renderTestimonials() {
    testimonialSlider.innerHTML = testimonials.map(t => `
        <div class="testimonial-card">
            <div class="testimonial-card-inner">
                <p>"${t.message}"</p>
                <h4>${t.name}</h4>
            </div>
        </div>
    `).join('');

    testimonialDots.innerHTML = testimonials.map((_, i) =>
        `<span class="dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></span>`
    ).join('');
}

function updateTestSlider() {
    const isMobile = window.innerWidth <= 768;
    const cardWidth = isMobile ? 100 : 33.333;
    let maxIndex = isMobile ? testimonials.length - 1 : testimonials.length - 3;
    if (maxIndex < 0) maxIndex = 0;
    if (testIndex > maxIndex) testIndex = 0;
    testimonialSlider.style.transform = `translateX(-${testIndex * cardWidth}%)`;
    document.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === testIndex);
    });
}

function goToSlide(i) {
    testIndex = i;
    updateTestSlider();
    resetTimer();
}

function nextSlide() {
    testIndex++;
    if (window.innerWidth <= 768) {
        if (testIndex >= testimonials.length) testIndex = 0;
    } else {
        if (testIndex > testimonials.length - 3) testIndex = 0;
    }
    updateTestSlider();
}

function prevSlide() {
    testIndex--;
    if (testIndex < 0) {
        testIndex = window.innerWidth <= 768 ? testimonials.length - 1 : Math.max(0, testimonials.length - 3);
    }
    updateTestSlider();
}

function startAutoSlide() {
    clearInterval(autoSlideTimer);
    autoSlideTimer = setInterval(nextSlide, 3000);
}

function stopAutoSlide() {
    clearInterval(autoSlideTimer);
}

function resetTimer() {
    stopAutoSlide();
    startAutoSlide();
}

// Hover pause
const testimonialWrapper = document.querySelector(".testimonial-wrapper");
if (testimonialWrapper) {
    testimonialWrapper.addEventListener("mouseenter", stopAutoSlide);
    testimonialWrapper.addEventListener("mouseleave", startAutoSlide);
}

// Nav buttons
document.getElementById("nextTestimonial").addEventListener("click", () => { nextSlide(); resetTimer(); });
document.getElementById("prevTestimonial").addEventListener("click", () => { prevSlide(); resetTimer(); });

// Init
initTestimonials();

/* =========================================
   ACTIVE NAV ON SCROLL
   ========================================= */
const sections = document.querySelectorAll("section[id]");
const navItems = document.querySelectorAll(".nav-links a");

window.addEventListener("scroll", () => {
    let current = "";
    sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        if (pageYOffset >= sectionTop - 150) {
            current = section.getAttribute("id");
        }
    });
    navItems.forEach((a) => {
        a.classList.remove("active-link");
        if (a.getAttribute("href") === `#${current}`) {
            a.classList.add("active-link");
        }
    });
});

// Reveal animation on load
activateScrollAnimation();
</script>
</body>
</html>
