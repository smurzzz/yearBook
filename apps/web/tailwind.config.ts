import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
				display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
			},
			/* The type scale is part of the design system, not ad-hoc inline sizes. */
			fontSize: {
				eyebrow: ['11px', { lineHeight: '14px', letterSpacing: '0.14em' }],
				caption: ['12px', { lineHeight: '16px' }],
				label: ['13px', { lineHeight: '18px' }],
				body: ['15px', { lineHeight: '22px' }],
				subhead: ['17px', { lineHeight: '24px' }],
				heading: ['20px', { lineHeight: '26px', letterSpacing: '-0.01em' }],
				title: ['26px', { lineHeight: '32px', letterSpacing: '-0.015em' }],
				display: ['34px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				/* Status system — always paired with an icon + text label */
				status: {
					pending: 'hsl(var(--pending))',
					'pending-soft': 'hsl(var(--pending-soft))',
					'pending-foreground': 'hsl(var(--pending-foreground))',
					approved: 'hsl(var(--approved))',
					'approved-soft': 'hsl(var(--approved-soft))',
					'approved-foreground': 'hsl(var(--approved-foreground))',
					rejected: 'hsl(var(--rejected))',
					'rejected-soft': 'hsl(var(--rejected-soft))',
					'rejected-foreground': 'hsl(var(--rejected-foreground))',
					reported: 'hsl(var(--reported))',
					'reported-soft': 'hsl(var(--reported-soft))',
					'reported-foreground': 'hsl(var(--reported-foreground))'
				},
				/* Yearbook committee surfaces */
				admin: {
					DEFAULT: 'hsl(var(--admin))',
					foreground: 'hsl(var(--admin-foreground))',
					surface: 'hsl(var(--admin-surface))',
					border: 'hsl(var(--admin-border))',
					ink: 'hsl(var(--admin-ink))'
				},
				/* Content laid over photography */
				onimage: {
					DEFAULT: 'hsl(var(--onimage))',
					muted: 'hsl(var(--onimage-muted))',
					surface: 'hsl(var(--onimage-surface))',
					border: 'hsl(var(--onimage-border))'
				},
				/* Fixed dark surface: viewers, toasts, scrims, device cutout */
				canvas: 'hsl(var(--canvas))',
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				tile: '0.625rem',
				sheet: '1.75rem'
			},
			boxShadow: {
				tile: 'var(--shadow-tile)',
				elegant: 'var(--shadow-elegant)',
				glow: 'var(--shadow-glow)',
				sheet: 'var(--shadow-sheet)'
			},
			transitionTimingFunction: {
				smooth: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'sheet-up': {
					from: { transform: 'translateY(100%)' },
					to: { transform: 'translateY(0)' }
				},
				'sheet-down': {
					from: { transform: 'translateY(0)' },
					to: { transform: 'translateY(100%)' }
				},
				'fade-in': {
					from: { opacity: '0' },
					to: { opacity: '1' }
				},
				'fade-out': {
					from: { opacity: '1' },
					to: { opacity: '0' }
				},
				'scale-in': {
					from: { opacity: '0', transform: 'scale(0.94)' },
					to: { opacity: '1', transform: 'scale(1)' }
				},
				'slide-in-right': {
					from: { opacity: '0', transform: 'translateX(14px)' },
					to: { opacity: '1', transform: 'translateX(0)' }
				},
				'rise-in': {
					from: { opacity: '0', transform: 'translateY(10px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				'toast-in': {
					from: { opacity: '0', transform: 'translateY(16px) scale(0.98)' },
					to: { opacity: '1', transform: 'translateY(0) scale(1)' }
				},
				shimmer: {
					from: { backgroundPosition: '120% 0' },
					to: { backgroundPosition: '-120% 0' }
				},
				'pulse-soft': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.55' }
				},
				'check-pop': {
					'0%': { opacity: '0', transform: 'scale(0.5)' },
					'60%': { opacity: '1', transform: 'scale(1.08)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},
				'draw-ring': {
					from: { transform: 'rotate(-90deg)' },
					to: { transform: 'rotate(270deg)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'sheet-up': 'sheet-up 0.32s cubic-bezier(0.2, 0.8, 0.2, 1)',
				'sheet-down': 'sheet-down 0.24s cubic-bezier(0.4, 0, 1, 1)',
				'fade-in': 'fade-in 0.2s ease-out',
				'fade-out': 'fade-out 0.18s ease-in',
				'scale-in': 'scale-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
				'slide-in-right': 'slide-in-right 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
				'rise-in': 'rise-in 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both',
				'toast-in': 'toast-in 0.26s cubic-bezier(0.2, 0.8, 0.2, 1)',
				shimmer: 'shimmer 1.6s linear infinite',
				'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
				'check-pop': 'check-pop 0.42s cubic-bezier(0.2, 0.8, 0.2, 1) both',
				'draw-ring': 'draw-ring 0.9s ease-out'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
