import { ImageResponse } from 'next/og';
import { getPostBySlug } from '@/app/actions';

export const runtime = 'edge';

export const alt = 'FeedSport Blog';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 48,
            background: 'linear-gradient(to bottom right, #10B981, #065F46)',
            color: 'white',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Post Not Found
        </div>
      ),
      {
        ...size,
      }
    );
  }

  // Using a Google Font as a reliable source
  const interRegular = await fetch(
    'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2'
  ).then((res) => res.arrayBuffer());

  const interBold = await fetch(
    'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.woff2'
  ).then((res) => res.arrayBuffer());


  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #022c22, #065f46, #10b981)',
          color: 'white',
          fontFamily: '"Inter"',
          padding: '60px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
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
            <span style={{ fontSize: 36, fontWeight: 'bold', marginLeft: 16 }}>FeedSport Blog</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    fontSize: 24,
                    marginBottom: 20,
                    fontWeight: 500,
                }}
            >
                {post.category}
            </span>
          <h1
            style={{
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.1,
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
              maxWidth: '90%',
            }}
          >
            {post.title}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/*eslint-disable-next-line @next/next/no-img-element*/}
          <img
            src={post.author.image}
            alt={post.author.name}
            width="60"
            height="60"
            style={{ borderRadius: '50%' }}
          />
          <span style={{ fontSize: 30, marginLeft: 20, fontWeight: 500 }}>
            By {post.author.name}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Inter',
          data: await interRegular,
          style: 'normal',
          weight: 400,
        },
        {
            name: 'Inter',
            data: await interBold,
            style: 'normal',
            weight: 700,
        },
      ],
    }
  );
}
