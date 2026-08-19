import type { SocialLink } from '@/lib/db/schema';
import { isSafeSocialUrl } from '@/lib/url-policy';
import styles from '@/styles/ContactCode.module.css';

interface ContactCodeProps {
  socials: SocialLink[];
}

const ContactCode = ({ socials }: ContactCodeProps) => {
  const safeSocials = socials.filter((social) => isSafeSocialUrl(social.url));

  return (
    <div className={styles.code}>
      <p className={styles.line}>
        <span className={styles.className}>.socials</span> &#123;
      </p>
      {safeSocials.map((item) => (
        <p className={styles.line} key={`${item.platform}:${item.url}`}>
          &nbsp;&nbsp;&nbsp;{item.platform}:{' '}
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.label}
          </a>
          ;
        </p>
      ))}
      <p className={styles.line}>&#125;</p>
    </div>
  );
};

export default ContactCode;
