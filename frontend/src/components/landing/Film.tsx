import { LANDING_VIDEO, type LandingVideo } from '@/lib/tamani/landing';
import { FilmPlayer } from './FilmPlayer';
import { Illustration } from './Illustration';

/** 2. The presentation video, right after the hero, on the notebook's cover. */
export function Film({ video = LANDING_VIDEO }: { video?: LandingVideo | null }) {
  return (
    <section id="film" className="lp-panel lp-panel--cover lp-film" aria-labelledby="lp-film-title">
      <div className="lp-wrap">
        <h2 id="lp-film-title">Regarde Tamani en action</h2>
        <p className="lp-film__sub">
          En une minute, une grossiste crée un produit, partage son lien avec ses clients, puis voit
          arriver leurs réponses et l&apos;avis sur la quantité à commander.
        </p>
        <div className="lp-film__frame">
          <FilmPlayer
            video={video}
            poster={
              <Illustration
                name="video-affiche"
                alt="La grossiste envoie son lien ; ses clients répondent depuis le marché, leur moto ou leur boutique."
                sizes="(min-width: 1024px) 980px, 100vw"
                fill
              />
            }
          />
        </div>
      </div>
    </section>
  );
}
