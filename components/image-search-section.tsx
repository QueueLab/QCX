
import { StreamableValue } from 'ai/rsc'
import { Card } from '@/components/ui/card'

interface Image {
  imageUrl: string
  link: string
  title: string
}

export const ImageSearchSection = ({ result }: { result: StreamableValue<string> }) => {
  const data = JSON.parse(result.value) as { images: Image[] }

  return (
    <Card className="p-4 mt-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {data.images?.map((image, index) => (
          <a key={index} href={image.link} target="_blank" rel="noopener noreferrer">
            <img
              src={image.imageUrl}
              alt={image.title}
              className="object-cover w-full h-full rounded-lg"
            />
          </a>
        ))}
      </div>
    </Card>
  )
}
