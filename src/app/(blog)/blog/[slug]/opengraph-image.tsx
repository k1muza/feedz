import { ImageResponse } from 'next/og'
import { getPostBySlug } from '@/app/actions'

export const runtime = 'nodejs'

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug)

  return new ImageResponse(
    (
      <img
        src={post?.image}
        alt={post?.title}
        style={{
          objectFit: 'cover',
          width: '100%',
          height: '100%',
          transform: 'scale(1.05)',
          transition: 'transform 0.5s'
        }}
      />
    )
  )
}
