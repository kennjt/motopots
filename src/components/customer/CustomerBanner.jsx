import bannerBackground from "../../assets/banner_bg.jpg";
import { ImageWithSkeleton } from "../common/Skeleton";

function CustomerBanner() {
  return (
    <div className="aspect-[5/1] w-full overflow-hidden">
                  <ImageWithSkeleton
                    src={bannerBackground}
                    alt=""
                    className="h-full w-full object-cover"
                  />
    </div>
  );
}

export default CustomerBanner;
