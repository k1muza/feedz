import { ImageResponse } from 'next/og';
import { getPostBySlug } from '@/app/actions';

export const runtime = 'nodejs';
export const alt = 'FeedSport Blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Font loading optimized for better performance
const fetchFont = async (weight: number) => {
  const weights = {
    400: 'UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2',
    700: 'UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2'
  };
  return fetch(
    `https://fonts.gstatic.com/s/inter/v13/${weights[weight as keyof typeof weights]}`
  ).then(res => res.arrayBuffer());
};

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  const [interRegular, interBold] = await Promise.all([
    fetchFont(400),
    fetchFont(700)
  ]);

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 72,
            background: 'linear-gradient(135deg, #022c22, #065f46)',
            color: 'white',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            textAlign: 'center',
            fontFamily: 'Inter'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 30 }}>
            <FeedSportLogo />
            <span style={{ fontSize: 42, fontWeight: 700, marginLeft: 20 }}>FeedSport Blog</span>
          </div>
          Post Not Found
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #022c22, #065f46, #047857)',
          color: 'white',
          fontFamily: 'Inter',
          padding: '60px',
          position: 'relative'
        }}
      >
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '40%',
          height: '100%',
          background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          zIndex: 0
        }} />
        
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          zIndex: 1,
          marginBottom: 'auto'
        }}>
          <FeedSportLogo />
          <span style={{ fontSize: 36, fontWeight: 700, marginLeft: 20 }}>FeedSport Blog</span>
        </div>

        {/* Main content */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          zIndex: 1,
          maxWidth: '900px'
        }}>
          <span
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: '8px 20px',
              borderRadius: '50px',
              fontSize: 28,
              marginBottom: 20,
              fontWeight: 600,
              alignSelf: 'flex-start',
              backdropFilter: 'blur(4px)'
            }}
          >
            {post.category}
          </span>
          
          <h1
            style={{
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: 30,
              textShadow: '0px 4px 6px rgba(0, 0, 0, 0.3)',
              maxWidth: '90%',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden'
            }}
          >
            {post.title}
          </h1>
        </div>

        {/* Footer */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          zIndex: 1,
          marginTop: 'auto',
          backgroundColor: 'rgba(2, 44, 34, 0.7)',
          borderRadius: 12,
          padding: '15px 25px',
          maxWidth: 'fit-content',
          backdropFilter: 'blur(4px)'
        }}>
          <img
            src={post.author.image || 'https://avatar.vercel.sh/feed-sport'}
            alt={post.author.name}
            width="70"
            height="70"
            style={{ 
              borderRadius: '50%',
              border: '3px solid #6EE7B7'
            }}
          />
          <div style={{ marginLeft: 20 }}>
            <span style={{ fontSize: 32, fontWeight: 600, display: 'block' }}>
              {post.author.name}
            </span>
            <span style={{ fontSize: 26, color: '#A7F3D0', opacity: 0.9 }}>
              {post.date || 'Published recently'}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: interRegular, weight: 400 },
        { name: 'Inter', data: interBold, weight: 700 }
      ]
    }
  );
}

// Extracted logo component
const FeedSportLogo = () => (
  <svg
    width="70"
    height="70"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17.612 10.052C18.107 10.554 18.23 11.28 17.94 11.96L12.79 22.213C12.508 22.879 11.758 23.218 11.092 22.936C10.426 22.654 10.087 21.904 10.369 21.238L15.52 10.985C15.801 10.319 16.551 9.98 17.217 10.262C17.41 10.334 17.513 10.457 17.612 10.552Z"
      fill="#6EE7B7"
    />
    <path
      d="M8.63601 1.063C9.30201 0.781 10.052 1.12 10.334 1.786L15.494 12.059C15.776 12.725 15.437 13.475 14.771 13.757C14.105 14.039 13.355 13.699 13.073 13.033L7.91301 2.76C7.63101 2.094 7.97001 1.344 8.63601 1.063Z"
      fill="#A7F3D0"
    />
  </svg>
);
