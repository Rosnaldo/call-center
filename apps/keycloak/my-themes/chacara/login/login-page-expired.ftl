<#import "template.ftl" as layout>
<@layout.registrationLayout>
    <!-- Icon circle -->
    <div class="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
        <!-- XCircle icon (inline SVG) -->
        <svg class="w-10 h-10 text-destructive" xmlns="http://www.w3.org/2000/svg"
            width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M15 9l-6 6"></path>
        <path d="M9 9l6 6"></path>
        </svg>
    </div>

    <#include "back-to-login.ftl">
</@layout.registrationLayout>
