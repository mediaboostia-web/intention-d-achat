import { LANDING_VIDEO, type LandingVideo } from '@/lib/tamani/landing';
import { FilmPlayer } from './FilmPlayer';
import { Illustration } from './Illustration';

/** 2. The presentation video, right after the hero, on the notebook's cover. */
export function Film({ video = LANDING_VIDEO }: { video?: LandingVideo | null }) {
  return (
    <section id="film" className="lp-panel lp-panel--cover lp-film" aria-labelledby="lp-film-title">
      <div className="lp-wrap">
        <h2 id="lp-film-title">Découvre Tamani en action.</h2>
        <p className="lp-film__sub">
          En quelques étapes, découvre comment créer une fiche produit, partager son lien et
          consulter les réponses de tes clients.
        </p>
        <div className="lp-film__frame">
          <FilmPlayer
            video={video}
            poster={
              <Illustration
                name="film-miniature"
                alt="Une commerçante sourit dans sa boutique, à côté du titre « Teste l’intérêt de tes clients avant de commander ton stock »."
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
