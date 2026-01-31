/**
 * Footer Social - X, Discord, GitHub icons for desktop and mobile footer
 * Connect with us (or don't, we won't judge)
 *
 * Same three links for both variants; only the wrapper/link/icon class names change
 * We use variant (desktop | mobile) so one component serves both footers
 *
 * @author Juan - The developer who linked the socials
 * (Coded with care, humor, and probably too much coffee)
 */

// GitHub icon from lucide - X and Discord are inline SVG (no lucide equivalent we use)
import { Github } from 'lucide-react'
// Footer styles - we need the right class names for social wrapper, link, icon
import styles from '../Footer.module.css'

type Variant = 'desktop' | 'mobile'

// Map variant to the right class names from Footer.module.css
const CLASSES: Record<Variant, { social: string; link: string; icon: string }> = {
  desktop: {
    social: styles.desktopFooterSocial,
    link: styles.desktopFooterSocialLink,
    icon: styles.desktopFooterSocialIcon,
  },
  mobile: {
    social: styles.mobileFooterSocial,
    link: styles.mobileFooterSocialLink,
    icon: styles.mobileFooterSocialIcon,
  },
}

// X (Twitter) SVG path - the bird that's now an X
// Because we're not loading an extra icon library just for this
const X_PATH = 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
// Discord SVG path - the chat app for gamers (and NFT enthusiasts)
const DISCORD_PATH =
  'M81.15,0c-1.2376,2.1973-2.3489,4.4704-3.3591,6.794-9.5975-1.4396-19.3718-1.4396-28.9945,0-.985-2.3236-2.1216-4.5967-3.3591-6.794-9.0166,1.5407-17.8059,4.2431-26.1405,8.0568C2.779,32.5304-1.6914,56.3725.5312,79.8863c9.6732,7.1476,20.5083,12.603,32.0505,16.0884,2.6014-3.4854,4.8998-7.1981,6.8698-11.0623-3.738-1.3891-7.3497-3.1318-10.8098-5.1523.9092-.6567,1.7932-1.3386,2.6519-1.9953,20.281,9.547,43.7696,9.547,64.0758,0,.8587.7072,1.7427,1.3891,2.6519,1.9953-3.4601,2.0457-7.0718,3.7632-10.835,5.1776,1.97,3.8642,4.2683,7.5769,6.8698,11.0623,11.5419-3.4854,22.3769-8.9156,32.0509-16.0631,2.626-27.2771-4.496-50.9172-18.817-71.8548C98.9811,4.2684,90.1918,1.5659,81.1752.0505l-.0252-.0505ZM42.2802,65.4144c-6.2383,0-11.4159-5.6575-11.4159-12.6535s4.9755-12.6788,11.3907-12.6788,11.5169,5.708,11.4159,12.6788c-.101,6.9708-5.026,12.6535-11.3907,12.6535ZM84.3576,65.4144c-6.2637,0-11.3907-5.6575-11.3907-12.6535s4.9755-12.6788,11.3907-12.6788,11.4917,5.708,11.3906,12.6788c-.101,6.9708-5.026,12.6535-11.3906,12.6535Z'

interface FooterSocialProps {
  variant: Variant
}

export default function FooterSocial({ variant }: FooterSocialProps) {
  const c = CLASSES[variant]
  return (
    <div className={c.social}>
      {/* X (Twitter) - the bird that's now an X */}
      <a
        href="https://x.com/MartechNetworks"
        target="_blank"
        rel="noopener noreferrer"
        className={c.link}
        aria-label="X (Twitter)"
      >
        <svg className={c.icon} viewBox="0 0 24 24" fill="currentColor">
          <path d={X_PATH} />
        </svg>
      </a>
      {/* Discord - the chat app for gamers (and NFT enthusiasts) */}
      <a
        href="https://discord.gg/dWTDBzKuXv"
        target="_blank"
        rel="noopener noreferrer"
        className={c.link}
        aria-label="Discord"
      >
        <svg className={c.icon} viewBox="0 0 126.644 96" fill="currentColor">
          <path d={DISCORD_PATH} />
        </svg>
      </a>
      {/* GitHub - the code repository (where all the magic happens) */}
      <a
        href="https://github.com"
        target="_blank"
        rel="noopener noreferrer"
        className={c.link}
        aria-label="GitHub"
      >
        <Github className={c.icon} />
      </a>
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - We're on the internet. Of course we have socials.
