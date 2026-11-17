import bannerBackground from "../assets/banner_bg.jpg";

function CustomerBanner() {
  return (
    <div className="aspect-[5/1] w-full overflow-hidden">
                  <img
                    src={bannerBackground}
                    alt=""
                    className="h-full w-full object-cover"
                  />
    </div>
  );
}

export default CustomerBanner;
