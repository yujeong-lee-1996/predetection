import main from "../img/main.png";

export default function Panel(){


    return(
        <div
                  style={{
                    color: "#000",
                    padding: "8px 50px",
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '20px',
                    marginBottom: 12,
                    fontSize: 28,
                    height: '200px',
                    backgroundImage: `url(${main})`,
                    backgroundSize: 'cover',
                    justifyContent: 'center'
                  }}
                >
                  <h3 style={{
                    color: "#ffffffff",
                    display: 'flex',
                    flexDirection: 'column',
                    fontWeight: '400'
                  }}>
                    전력 설비 모니터링 시스템</h3>
                </div>
    )
}